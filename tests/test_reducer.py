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

import datetime
import os
import sys
import unittest

import pytz

sys.path.insert(1, os.path.abspath(
    os.path.join(os.path.dirname(__file__), '../convert_from_telescope')))
import reducer

DEFAULT_TIMEZONE = pytz.timezone('US/Eastern')


def make_date(year, month, day, hour, minute, second,
              timezone=DEFAULT_TIMEZONE):
  return datetime.datetime(year=year,
                           month=month,
                           day=day,
                           hour=hour,
                           minute=minute,
                           second=second,
                           tzinfo=timezone)


class MedianReducerTest(unittest.TestCase):

  def setUp(self):
    self.maxDiff = None

  def test_reduce_by_day_single_metric(self):
    metrics_raw = {
        'download_throughput': (
            (make_date(2014, 10, 1, 23, 45, 58), 25.0),
            (make_date(2014, 10, 1, 3, 12, 42), 15.5),
            (make_date(2014, 10, 1, 5, 19, 35), 1.0),
            (make_date(2014, 10, 26, 5, 29, 25), 6.0),
            (make_date(2014, 10, 26, 15, 21, 42), 4.0),
            (make_date(2014, 11, 1, 7, 24, 24), 34.6),
            )
        }
    # Results should be aggregated such that there is a single value and sample
    # count for each day represented.
    reduced_expected = {
        datetime.datetime(2014, 10, 1): {
            'download_throughput': 15.5, 'download_throughput_n': 3},
        datetime.datetime(2014, 10, 26): {
            'download_throughput': 5.0, 'download_throughput_n': 2},
        datetime.datetime(2014, 11, 1): {
            'download_throughput': 34.6, 'download_throughput_n': 1},
        }
    median_reducer = reducer.MedianReducer()
    reduced_actual = median_reducer.reduce_by_day(metrics_raw)
    self.assertDictEqual(reduced_expected, reduced_actual)

  def test_reduce_by_day_multi_metric(self):
    metrics_raw = {
        'download_throughput': (
            (make_date(2014, 10, 1, 23, 45, 58), 25.0),
            (make_date(2014, 10, 1, 3, 12, 42), 15.0),
            ),
        'average_rtt': (
            (make_date(2014, 10, 1, 23, 45, 58), 6.0),
            (make_date(2014, 10, 1, 3, 12, 42), 5.0),
            )
        }
    # Reducing should keep separate metrics independent from one another.
    reduced_expected = {
        datetime.datetime(2014, 10, 1): {
            'download_throughput': 20.0, 'download_throughput_n': 2,
            'average_rtt': 5.5, 'average_rtt_n': 2},
        }
    median_reducer = reducer.MedianReducer()
    reduced_actual = median_reducer.reduce_by_day(metrics_raw)
    self.assertDictEqual(reduced_expected, reduced_actual)

  def test_reduce_by_hour_of_day_per_month_single_metric(self):
    metrics_raw = {
        'download_throughput': (
            (make_date(2014, 10, 9, 5, 45, 58), 19.0),
            (make_date(2014, 10, 1, 7, 22, 18), 45.0),
            (make_date(2014, 10, 26, 5, 29, 25), 20.0),
            (make_date(2014, 11, 5, 5, 19, 35), 28.0),
            (make_date(2014, 10, 5, 7, 24, 24), 35.0),
            )
        }
    # Results should be aggregated such that there is a single value and sample
    # count for each hour of day represented each month.
    reduced_expected = {
        datetime.datetime(2014, 10, 1, 5, 0, 0): {
            'download_throughput': 19.5, 'download_throughput_n': 2},
        datetime.datetime(2014, 10, 1, 7, 0, 0): {
            'download_throughput': 40.0, 'download_throughput_n': 2},
        datetime.datetime(2014, 11, 1, 5, 0, 0): {
            'download_throughput': 28.0, 'download_throughput_n': 1},
        }
    median_reducer = reducer.MedianReducer()
    reduced_actual = median_reducer.reduce_by_hour_of_day_per_month(metrics_raw)
    self.assertDictEqual(reduced_expected, reduced_actual)


if __name__ == '__main__':
  unittest.main()

