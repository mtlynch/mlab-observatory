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

import observatory_file_writer


class ObservatoryFileWriterTest(unittest.TestCase):

  def test_write_hourly_datafile(self):
    hourly_metrics_input = {
        datetime.datetime(2014, 10, 1, 0): {
            'average_rtt': 45.6,
            'average_rtt_n': 34
            },
        datetime.datetime(2014, 10, 1, 2): {
            'average_rtt': 42.1,
            'average_rtt_n': 31
            },
        datetime.datetime(2014, 10, 1, 1): {
            'average_rtt': 29.3,
            'average_rtt_n': 16
            }
        }
    aggregate_writer = observatory_file_writer.ObservatoryFileWriter()
    written_datafile_expected = [
        'month,hour,year,average_rtt,average_rtt_n',
        '10,0,2014,45.6,34',
        '10,1,2014,29.3,16',
        '10,2,2014,42.1,31',
        ]
    mock_output_file = io.BytesIO()
    aggregate_writer.write_hourly_datafile(hourly_metrics_input,
                                           mock_output_file)
    written_datafile_actual = mock_output_file.getvalue().strip().split('\r\n')
    self.assertListEqual(written_datafile_expected, written_datafile_actual)

  def test_write_daily_datafile(self):
    daily_metrics_input = {
        datetime.datetime(2014, 11, 11): {
            'average_rtt': 45.6,
            'average_rtt_n': 34
            },
        datetime.datetime(2014, 11, 13): {
            'average_rtt': 42.1,
            'average_rtt_n': 31
            },
        datetime.datetime(2014, 11, 12): {
            'average_rtt': 29.3,
            'average_rtt_n': 16
            }
        }
    aggregate_writer = observatory_file_writer.ObservatoryFileWriter()
    written_datafile_expected = [
        'month,day,year,average_rtt,average_rtt_n',
        '11,11,2014,45.6,34',
        '11,12,2014,29.3,16',
        '11,13,2014,42.1,31',
        ]
    mock_output_file = io.BytesIO()
    aggregate_writer.write_daily_datafile(daily_metrics_input,
                                          mock_output_file)
    written_datafile_actual = mock_output_file.getvalue().strip().split('\r\n')
    self.assertListEqual(written_datafile_expected, written_datafile_actual)


if __name__ == '__main__':
  unittest.main()

