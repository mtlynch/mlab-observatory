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

import datetime
import io
import unittest

import mock
import pytz

import telescope_data_parser


class SingleTelescopeResultReaderTest(unittest.TestCase):

  def test_get_metadata_year_border(self):
    filename = '2012-01-01-000000+366d_atl01_comcast_average_rtt-raw.csv'
    metadata_expected = {
        'start_date_string': '2012-01-01-000000',
        'start_date': datetime.datetime(2012, 1, 1, tzinfo=pytz.utc),
        'duration_string': '366',
        'site_name': 'atl01',
        'metro': 'atl',
        'isp': 'comcast',
        'metric_name': 'average_rtt',
        }
    reader = telescope_data_parser.SingleTelescopeResultReader(filename)
    metadata_actual = reader.get_metadata()
    self.assertDictEqual(metadata_expected, metadata_actual)

  def test_get_metadata_ignored_characters_in_isp(self):
    """The v1.0 release of Telescope left ampersands in filenames, while later
    versions stripped special characters. Verify that we ignore ampersands when
    parsing the ISP names so that 'at&t' is the same as 'att'.
    """
    filename = '2012-01-01-000000+366d_atl01_at&t_average_rtt-raw.csv'
    metadata_expected = {
        'start_date_string': '2012-01-01-000000',
        'start_date': datetime.datetime(2012, 1, 1, tzinfo=pytz.utc),
        'duration_string': '366',
        'site_name': 'atl01',
        'metro': 'atl',
        'isp': 'att',
        'metric_name': 'average_rtt',
        }
    reader = telescope_data_parser.SingleTelescopeResultReader(filename)
    metadata_actual = reader.get_metadata()
    self.assertDictEqual(metadata_expected, metadata_actual)

  def test_get_metadata_arbitrary_start_time(self):
    filename = (
        '2013-05-15-133506+21d_lga02_comcast_download_throughput-raw.csv')
    metadata_expected = {
        'start_date_string': '2013-05-15-133506',
        'start_date': datetime.datetime(2013, 5, 15, 13, 35, 6,
                                        tzinfo=pytz.utc),
        'duration_string': '21',
        'site_name': 'lga02',
        'metro': 'lga',
        'isp': 'comcast',
        'metric_name': 'download_throughput',
        }
    reader = telescope_data_parser.SingleTelescopeResultReader(filename)
    metadata_actual = reader.get_metadata()
    self.assertDictEqual(metadata_expected, metadata_actual)

  @mock.patch('__builtin__.open')
  def test_iter(self, mock_open):
    file_contents = '\n'.join((
        '1416501638,15.9014',
        '1326589323,109.11934',
        '1327712523,80.11242'))
    mock_input_file = io.BytesIO(file_contents)
    mock_open.return_value = mock_input_file
    results_expected = [
        (datetime.datetime(2014, 11, 20, 16, 40, 38, 0, pytz.utc), 15.9014),
        (datetime.datetime(2012, 1, 15, 1, 2, 3, 0, pytz.utc), 109.11934),
        (datetime.datetime(2012, 1, 28, 1, 2, 3, 0, pytz.utc), 80.11242)]
    reader = telescope_data_parser.SingleTelescopeResultReader(
        'mock_filename.csv')
    results_actual = [result_row for result_row in reader]
    self.assertListEqual(results_expected, results_actual)


class MergedTelescopeResultReaderTest(unittest.TestCase):

  def test_iter(self):
    mock_readers = [mock.MagicMock() for i in range(2)]
    mock_readers[0].__iter__.return_value = iter(['a', 'b', 'c'])
    mock_readers[1].__iter__.return_value = iter(['d', 'e', 'f'])

    merged_reader = telescope_data_parser.MergedTelescopeResultReader()
    for mock_reader in mock_readers:
      merged_reader.add_reader(mock_reader)

    results_expected = ['a', 'b', 'c', 'd', 'e', 'f']
    results_actual = [result_row for result_row in merged_reader]
    self.assertItemsEqual(results_expected, results_actual)


if __name__ == '__main__':
  unittest.main()

