#!/usr/bin/env python
# -*- coding: UTF-8 -*-
#
# Copyright 2014 Measurement Lab
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""Module for parsing data produced by Telescope."""

import csv
import datetime
import os
import re

import pytz

try:
    import telescope.telescope.utils as telescope_utils
except ImportError:
    raise Exception(('Could not find Telescope library. '
                     'Please verify all submodules are checked out.'))


class Error(Exception):
    pass


class ParseFailedError(Error):
    """Error thrown when parsing Telescope data fails."""
    pass


def _parse_filename_for_metadata(file_path):
    """Parses a telescope file path for metadata.

    Args:
        file_path: (str) Filename (and optionally, path) of a Telescope output
            data file.

    Returns:
      (dict) A dictionary containing parsed values from the filename:
          duration_string (str): The duration value in its original string
              form.
          isp: (str) Name of the access isp associated with this file (e.g.
              'comcast').
          metric_name: (str) Name of metric in this file (e.g.
              'download_throughput').
          metro: (str) Three letter code for metro area of this file (e.g.
              'lga').
          site_name: (str) Site name associated with this file (e.g. 'lax01').
          start_date: (datetime.datetime) The start time as a datetime object in
              UTC time.
          start_date_string: (str) The start date in its original string form.

    Raises:
      ValueError: The filename was in unexpected format.
    """
    parsed = {}
    filename_part = os.path.split(file_path)[1]

    match = re.match(
        r'^(\d{4}\-\d{2}\-\d{2}\-\d{6})\+(.*?)d_(.+?)_(.+?)_(.+?)\-raw\.csv$',
        filename_part)
    if len(match.groups()) != 5:
        raise ValueError('InputFilenameUnexpectedFormat')

    parsed['start_date_string'] = match.group(1)
    parsed['duration_string'] = match.group(2)
    parsed['site_name'] = match.group(3)
    parsed['isp'] = telescope_utils.strip_special_chars(match.group(4))
    parsed['metric_name'] = match.group(5)

    parsed['metro'] = parsed['site_name'][:3]

    start_date_no_tz = datetime.datetime.strptime(parsed['start_date_string'],
                                                  '%Y-%m-%d-%H%M%S')
    parsed['start_date'] = telescope_utils.make_datetime_utc_aware(
        start_date_no_tz)

    return parsed


def _parse_data_file(telescope_file):
    """Parses the content of a Telescope output file.

    Parses a data file output from Telescope into a list of (timestamp, value)
    pairs parsed from the rows of the file.

    Args:
        telescope_file: (file) File object containing Telescope output data. The
            file must be in CSV format with a UNIX timestamp in the first column
            and the value in the second column. The file cannot have a header
            row.

    Returns:
        (list) A list of (datetime, value) pairs parsed from the Telescope
        output, where datetime is the time of the result (in UTC) and value is
        a float.
    """
    rows = []

    data_file_csv = csv.DictReader(telescope_file, ('timestamp', 'result'))
    for row in data_file_csv:
        time_as_datetime = datetime.datetime.fromtimestamp(
            float(row['timestamp']), pytz.utc)
        rows.append((time_as_datetime, float(row['result'])))

    return rows


class TelescopeResultReader(object):
    """Base class for reading Telescope result files."""

    def __iter__(self):
        """Iterator for TelescopeResult objects read.

    Returns:
      (list): A (datetime, value) Telescope result pair, where datetime is the
      time of the result (in UTC) and value is a float.
    """
        for row in self._read_rows():
            yield row

    def _read_rows(self):
        raise NotImplementedError('Subclasses must implement this function.')


class SingleTelescopeResultReader(TelescopeResultReader):
    """Reads a single Telescope result file."""

    def __init__(self, result_filename):
        self._result_filename = result_filename

    def _read_rows(self):
        try:
            with open(self._result_filename) as data_file:
                return _parse_data_file(data_file)
        except csv.Error as e:
            raise ParseFailedError(
                'Failed to parse Telescope CSV file: %s\nError: %s' %
                (self._result_filename, e))

    def get_metadata(self):
        return _parse_filename_for_metadata(self._result_filename)


class MergedTelescopeResultReader(TelescopeResultReader):
    """Reads a series of Telescope result files.

    This result reader reads a series of Telescope result files, presenting them
    as a single, aggregated Telescope result.
    """

    def __init__(self):
        self._result_readers = []

    def add_reader(self, result_reader):
        self._result_readers.append(result_reader)

    def _read_rows(self):
        merged_rows = []
        for reader in self._result_readers:
            merged_rows.extend(reader)
        return merged_rows
