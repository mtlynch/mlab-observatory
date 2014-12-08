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
import StringIO
import unittest

import pytz

import telescope_data_parser


class TelescopeDataParserTest(unittest.TestCase):

  def test_parse_filename_for_metadata_year_border(self):
    filename = '2012-01-01-000000+366d_atl01_at&t_average_rtt-raw.csv'
    parsed_expected = {
        'start_date_string': '2012-01-01-000000',
        'start_date': datetime.datetime(2012, 1, 1, tzinfo=pytz.utc),
        'duration_string': '366',
        'site_name': 'atl01',
        'metro': 'atl',
        'isp': 'at&t',
        'metric_name': 'average_rtt',
        }
    parsed_actual = telescope_data_parser.parse_filename_for_metadata(filename)
    self.assertDictEqual(parsed_expected, parsed_actual)

  def test_parse_filename_for_metadata_arbitrary_start_time(self):
    filename = '2013-05-15-133506+21d_lga02_comcast_download_throughput-raw.csv'
    parsed_expected = {
        'start_date_string': '2013-05-15-133506',
        'start_date': datetime.datetime(2013, 5, 15, 13, 35, 6,
                                        tzinfo=pytz.utc),
        'duration_string': '21',
        'site_name': 'lga02',
        'metro': 'lga',
        'isp': 'comcast',
        'metric_name': 'download_throughput',
        }
    parsed_actual = telescope_data_parser.parse_filename_for_metadata(filename)
    self.assertDictEqual(parsed_expected, parsed_actual)

  def test_parse_data_file(self):
    file_contents = '\n'.join((
        '1416501638,15.9014',
        '1326589323,109.11934',
        '1327712523,80.11242'))
    mock_input_file = StringIO.StringIO(file_contents)
    parsed_expected = [
        (datetime.datetime(2014, 11, 20, 16, 40, 38, 0, pytz.utc), 15.9014),
        (datetime.datetime(2012, 1, 15, 1, 2, 3, 0, pytz.utc), 109.11934),
        (datetime.datetime(2012, 1, 28, 1, 2, 3, 0, pytz.utc), 80.11242)]
    parsed_actual = telescope_data_parser.parse_data_file(mock_input_file)
    self.assertListEqual(parsed_expected, parsed_actual)

if __name__ == '__main__':
  unittest.main()

