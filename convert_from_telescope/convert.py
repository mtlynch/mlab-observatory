#!/usr/bin/env python
# -*- coding: UTF-8 -*-
#
# Copyright 2015 Measurement Lab
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

import logging
import os
import sys

sys.path.insert(1,
                os.path.abspath(os.path.join(os.path.dirname(__file__),
                                             './telescope')))
import telescope.utils
import telescope_data_parser


def _ensure_dir_exists(dir_path):
  """Ensures that a given directory path exists (creating it if necessary).

  Creates a directory path for a given file path if the directory path does
  not already exist. For example, if dir_path='foo/bar/baz/' and only
  directory 'foo' exists, this function will create 'foo/bar/baz'.

  Args:
    dir_path: (str) Directory path to create.
  """
  if not os.path.exists(dir_path):
    os.makedirs(dir_path)


def _generate_output_path(group_key, output_dir, output_type):
  """Generates the output path for an output file.

  Generates the output path (including output directory and filename),
  given a group key and type of output data to be written to the file.

  Args:
    group_key: (str) The key that identifies this dataset.
    output_dir: (str) The directory to which this file will be written.
    output_type: (str) The type of data to be written (either 'daily' or
      'hourly').

  Returns:
    (str) A generated path for the output file (stripped of illegal filename
    characters).
  """
  filename = '%s_%s.csv' % (group_key, output_type)
  filename = telescope.utils.strip_special_chars(filename)
  return os.path.join(output_dir, filename)


def _write_valid_keys_file(valid_keys, valid_keys_file):
  """Writes the valid result group keys to a file.

  Writes the valid keys file, indicating the keys for which we generated
  output data. The keys are written in plaintext with one key per line in
  alphabetically sorted order.

  Args:
    valid_keys: (list) A list of strings indicating the valid keys.
    valid_keys_file: (file) File to which to write the keys.
  """
  keys_sorted = sorted(valid_keys)
  valid_keys_file.write(os.linesep.join(keys_sorted))


class ResultConverter(object):
  """Converts Telescope data into Observatory format."""

  def __init__(self, result_grouper, result_reducer, observatory_file_writer,
               output_dir, valid_keys_path):
    """Creates a converter from Telescope data to Observatory data.

    Args:
      result_grouper: Result grouper, which groups Telescope results according
        to their metadata.
      result_reducer: Result reducer, which reduces sets of raw results into
        aggregate values compatible with Observatory.
      observatory_file_writer: File writer to write processed results into a
        file format that Observatory can read from.
      output_dir: (str) The directory to which to write converted results.
      valid_keys_path: (str) The file path to which to write the valid group
        keys created during the convert operation.
    """
    self._logger = logging.getLogger('telescope-convert')
    self._result_grouper = result_grouper
    self._result_reducer = result_reducer
    self._observatory_file_writer = observatory_file_writer
    self._output_dir = output_dir
    self._valid_keys_path = valid_keys_path

  def convert_to_observatory_format(self, input_filenames):
    """Converts a list of files in Telescope format into Observatory format.

    Parses a list of files output from Telescope and converts them to files
    that Observatory can read, placing the results into self._output_dir.

    Args:
      input_filenames: (list) A list of files created by Telescope.
    """
    result_readers = []
    for filename in input_filenames:
      result_readers.append(telescope_data_parser.SingleTelescopeResultReader(
          filename))

    result_groups = self._result_grouper.group_results(result_readers)
    self._convert_result_groups(result_groups)

  def _convert_result_groups(self, result_groups):
    """Converts Telescope result groups into Observatory format.

    Args:
      result_groups: (dict) A dictionary of raw Telescope results, keyed by
        group key, then by metric name, for example:
        {
          'lga01_comcast': {
            'download_throughput': [
              (<datetime-2014-10-22@12:35:01>, 24.5),
              (<datetime-2014-10-01@04:42:23>, 14.3),
              (<datetime-2014-10-02@06:19:22>, 21.3),
              ...
              ],
            'upload_throughput': ...,
            },
          'sea01_verizon': {
            'download_throughput': ...,
            'upload_throughput': ...,
            },
          'mia02_twc': ...,
          ...
        }
    """
    for group_key, metric_results in result_groups.iteritems():
      self._convert_result_group_by_day(group_key, metric_results)
      self._convert_result_group_by_hour(group_key, metric_results)

    _ensure_dir_exists(os.path.dirname(self._valid_keys_path))
    with open(self._valid_keys_path, 'w') as valid_keys_file:
      _write_valid_keys_file(result_groups.keys(), valid_keys_file)

  def _convert_result_group_by_day(self, group_key, metric_results):
    self._convert_result_group(
        group_key, metric_results, 'daily',
        self._result_reducer.reduce_by_day,
        self._observatory_file_writer.write_daily_datafile)

  def _convert_result_group_by_hour(self, group_key, metric_results):
    self._convert_result_group(
        group_key, metric_results, 'hourly',
        self._result_reducer.reduce_by_hour_of_day_per_month,
        self._observatory_file_writer.write_hourly_datafile)

  def _convert_result_group(self, group_key, metric_results, output_type,
                            reducer_func, writer_func):
    """Converts a group of Telescope results into Observatory files.

    Args:
      group_key: (str) The key that identifies this result group (e.g.
        lga01_comcast).
      metric_results: (dict) A dictionary of raw Telescope results, keyed by
        metric name, for example:
        {
          'download_throughput': [
            (<datetime-2014-10-22@12:35:01>, 24.5),
            (<datetime-2014-10-01@04:42:23>, 14.3),
            (<datetime-2014-10-02@06:19:22>, 21.3),
            ...
            ],
          'upload_throughput': [
            (<datetime-2014-10-22@12:35:01>, 4.1),
            (<datetime-2014-10-01@04:42:23>, 6.2),
            (<datetime-2014-10-02@06:19:22>, 8.9),
            ...
          ]
        }
      output_type: (str) The type of data to be written (either 'daily' or
        'hourly').
      reducer_func: (function) Function to reduce sets of raw results into
        aggregate metrics that Observatory can display.
      writer_func: (function) Function to write results to an Observatory-
        compatible file.
    """
    self._logger.info('Converting result group %s (%s)',
                      group_key, output_type)
    results_reduced = reducer_func(metric_results)
    _ensure_dir_exists(self._output_dir)
    output_path = _generate_output_path(group_key, self._output_dir,
                                        output_type)
    with open(output_path, 'w') as output_file:
      writer_func(results_reduced, output_file)

