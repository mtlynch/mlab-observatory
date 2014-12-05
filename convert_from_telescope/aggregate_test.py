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
import pytz
import unittest

import aggregate

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

def make_date_from_utc(year, month, day, hour=0, minute=0, second=0,
                       timezone=DEFAULT_TIMEZONE):
  utc_datetime = datetime.datetime(year=year,
                                   month=month,
                                   day=day,
                                   hour=hour,
                                   minute=minute,
                                   second=second,
                                   tzinfo=pytz.utc)
  return utc_datetime.astimezone(timezone)


def timestamp_to_datetime(timestamp, timezone=DEFAULT_TIMEZONE):
  return datetime.datetime.fromtimestamp(timestamp, timezone)


class AggregateTest(unittest.TestCase):

  def setUp(self):
    # Get full output in test failures
    self.maxDiff = None

  def test_aggregate_by_month(self):
    results = [
        (make_date(2014, 10,  1,  3, 45, 58), 45.9),
        (make_date(2014, 10, 31, 23, 45, 58), 19.2),
        (make_date(2014, 11, 15,  7, 24, 24), 34.6),
        ]
    aggregated_expected = {
        datetime.datetime(2014, 10,  1): [45.9, 19.2],
        datetime.datetime(2014, 11,  1): [34.6],
        }
    aggregated_actual = aggregate.aggregate_by_month(results)
    self.assertDictEqual(aggregated_expected, aggregated_actual)

  def test_aggregate_by_day_during_daylight_saving_time_switch(self):
    """ Verify that days in DST and days in non-DST are aggregated together.

    """
    results = [
        (make_date(2013,  3,  6,  3, 45, 58), 1.1),
        (make_date(2013,  3, 15, 23, 45, 58), 2.2),
        (make_date(2013, 11,  1,  3, 45, 58), 3.3),
        (make_date(2013, 11,  5, 23, 45, 58), 4.4),
        ]
    aggregated_expected = {
        datetime.datetime(2013,  3,  1): [1.1, 2.2],
        datetime.datetime(2013, 11,  1): [3.3, 4.4],
        }
    aggregated_actual = aggregate.aggregate_by_month(results)
    self.assertDictEqual(aggregated_expected, aggregated_actual)

  def test_aggregate_by_day(self):
    results = [
        (make_date(2014, 10,  1, 23, 45, 58), 19.2),
        (make_date(2014, 10,  1,  3, 45, 58), 45.9),
        (make_date(2014, 11,  5,  5, 19, 35), 28.8),
        (make_date(2014, 10, 26,  5, 29, 25), 17.4),
        (make_date(2014, 11,  1,  7, 24, 24), 34.6),
        ]
    aggregated_expected = {
        datetime.datetime(2014, 10,  1): [19.2, 45.9],
        datetime.datetime(2014, 10, 26): [17.4],
        datetime.datetime(2014, 11,  1): [34.6],
        datetime.datetime(2014, 11,  5): [28.8],
        }
    aggregated_actual = aggregate.aggregate_by_day(results)
    self.assertDictEqual(aggregated_expected, aggregated_actual)

  def test_aggregate_by_day_during_daylight_saving_time_switch(self):
    results = [
        (make_date_from_utc(2013,  3, 10,  5,  0,  0), 1.1),
        (make_date_from_utc(2013,  3, 10,  9,  0,  0), 2.2),
        (make_date_from_utc(2013, 11,  3,  4,  0,  0), 3.3),
        (make_date_from_utc(2013, 11,  3, 10,  0,  0), 4.4),
        ]
    aggregated_expected = {
        datetime.datetime(2013,  3, 10): [1.1, 2.2],
        datetime.datetime(2013, 11,  3): [3.3, 4.4],
        }
    aggregated_actual = aggregate.aggregate_by_day(results)
    self.assertDictEqual(aggregated_expected, aggregated_actual)

  def test_aggregate_by_hour_of_day(self):
    results = [
        (make_date(2013,  9,  1, 23, 45, 58), 19.2),
        (make_date(2012,  5,  1,  7, 45, 58), 45.9),
        (make_date(2014, 11, 23,  5, 19, 35), 28.8),
        (make_date(2014,  3, 26,  5, 29, 25), 17.4),
        (make_date(2014, 11, 30,  7, 24, 24), 34.6),
        ]
    aggregated_expected = {
         5: [28.8, 17.4],
         7: [45.9, 34.6],
        23: [19.2],
        }
    aggregated_actual = aggregate.aggregate_by_hour_of_day(results)
    self.assertDictEqual(aggregated_expected, aggregated_actual)

  def test_aggregate_by_hour_of_day_during_daylight_saving_time_switch(self):
    """ Verify that results are aggregated together even if they occur in DST
        vs. non-DST time.
    """
    results = [
        (make_date_from_utc(2013, 11,  3,  5, 30,  0), 1.1), # 1:30 AM EDT
        (make_date_from_utc(2013, 11,  3,  6, 30,  0), 2.2), # 1:30 AM EST
        ]
    aggregated_expected = {
         1: [1.1, 2.2],
        }
    aggregated_actual = aggregate.aggregate_by_hour_of_day(results)
    self.assertDictEqual(aggregated_expected, aggregated_actual)

  def test_aggregate_by_hour_of_day_per_month(self):
    results = [
        (make_date(2014, 10,  9, 23, 45, 58), 19.2),
        (make_date(2014, 10,  1,  7, 45, 58), 45.9),
        (make_date(2014, 10, 26,  5, 29, 25), 17.4),
        (make_date(2014, 11,  5,  5, 19, 35), 28.8),
        (make_date(2014, 10,  5,  7, 24, 24), 34.6),
        ]
    aggregated_expected = {
        datetime.datetime(2014, 10,  1,  5,  0,  0): [17.4],
        datetime.datetime(2014, 10,  1,  7,  0,  0): [45.9, 34.6],
        datetime.datetime(2014, 10,  1, 23,  0,  0): [19.2],
        datetime.datetime(2014, 11,  1,  5,  0,  0): [28.8],
        }
    aggregated_actual = aggregate.aggregate_by_hour_of_day_per_month(results)
    self.assertDictEqual(aggregated_expected, aggregated_actual)

  def test_aggregate_by_hour_of_day_per_month_during_daylight_saving_time_switch(self):
    """ Verify that results are aggregated together even if they occur in DST
        vs. non-DST time.
    """
    results = [
        (make_date_from_utc(2013, 11,  3,  5, 30,  0), 1.1), # 1:30 am EDT
        (make_date_from_utc(2013, 11,  3,  6, 30,  0), 2.2), # 1:30 am EST
        ]
    aggregated_expected = {
          datetime.datetime(2013, 11,  1,  1,  0, 0): [1.1, 2.2],
        }
    aggregated_actual = aggregate.aggregate_by_hour_of_day_per_month(results)
    self.assertDictEqual(aggregated_expected, aggregated_actual)

  def test_aggregate_by_hour(self):
    results = [
        (make_date(2014, 10,  9, 23, 45, 58), 19.2),
        (make_date(2014, 10,  1,  7, 45, 58), 45.9),
        (make_date(2014, 10, 26,  5, 29, 25), 17.4),
        (make_date(2014, 11,  5,  5, 19, 35), 28.8),
        (make_date(2014, 10,  9, 23, 15, 22), 42.0),
        (make_date(2014, 10,  5,  7, 24, 24), 34.6),
        ]
    aggregated_expected = {
        datetime.datetime(2014, 10,  1,  7,  0,  0): [45.9],
        datetime.datetime(2014, 10,  5,  7,  0,  0): [34.6],
        datetime.datetime(2014, 10,  9, 23,  0,  0): [19.2, 42.0],
        datetime.datetime(2014, 10, 26,  5,  0,  0): [17.4],
        datetime.datetime(2014, 11,  5,  5,  0,  0): [28.8],
        }
    aggregated_actual = aggregate.aggregate_by_hour(results)
    self.assertDictEqual(aggregated_expected, aggregated_actual)

  def test_aggregate_by_hour_during_daylight_saving_time_switch(self):
    """ Verify that results are aggregated together even if they occur in DST
        vs. non-DST time.
    """
    results = [
        (make_date_from_utc(2013, 11,  3,  5, 30,  0), 1.1), # 1:30 am EDT
        (make_date_from_utc(2013, 11,  3,  6, 30,  0), 2.2), # 1:30 am EST
        ]
    aggregated_expected = {
          datetime.datetime(2013, 11,  3,  1,  0, 0): [1.1, 2.2],
        }
    aggregated_actual = aggregate.aggregate_by_hour(results)
    self.assertDictEqual(aggregated_expected, aggregated_actual)


if __name__ == '__main__':
  unittest.main()
