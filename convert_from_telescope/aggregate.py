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


# Note: All functions in this module return datetimes in timezone-naive format.
#   This is necessary because we are lumping together results from DST and
#   non-DST times into the same bin. For example, there are certain hours that
#   occur twice due to DST, but we don't want to put them in separate bins
#   (e.g. 1:30 AM EDT and 1:45 EST should be aggregated together). Similarly,
#   when we aggregate by day, we don't want to split the day into a DST and
#   non-DST bin. As a result, the times no longer have a "true" timezone, so
#   we use timezone-naive datetimes.


def aggregate_by_month(results):
  """ Aggregate test results by month.

      Args:
        results (list): A list of 2-tuples where the first entry is a datetime
          and the second is a float. For example:
          [(<datetime-2014-10-05>, 24.1), (<datetime-2014-11-02>, 90.2), ...]

      Returns:
        (dict) A dictionary of lists, keyed by datetime. Each key is a datetime
        rounded to midnight on the first day of the month. For example:
        {
          <datetime-2014-10-01@00:00:00>: [24.1, 35.8, 16.6, ...],
          <datetime-2014-11-01@00:00:00>: [92.2, 100.3, 23.0, ...],
          <datetime-2014-12-01@00:00:00>: [18.0, 19.8, 97.6, ...],
          ...
        }
  """
  aggregation_func = lambda result_datetime: (
      datetime.datetime(year = result_datetime.year,
                        month = result_datetime.month,
                        day = 1))
  return _aggregate_results(results, aggregation_func)


def aggregate_by_day(results):
  """ Aggregate test results by day.

      Args:
        results (list): A list of 2-tuples where the first entry is a datetime
          and the second is a float. For example:
          [(<datetime-2014-10-05>, 24.1), (<datetime-2014-11-02>, 90.2), ...]

      Returns:
        (dict) A dictionary of lists, keyed by datetime. Each key is a datetime
        rounded to midnight of the given day. For example:
        {
          <datetime-2014-10-16@00:00:00>: [24.1, 35.8, 16.6, ...],
          <datetime-2014-10-17@00:00:00>: [92.2, 100.3, 23.0, ...],
          <datetime-2014-10-25@00:00:00>: [18.0, 19.8, 97.6, ...],
          ...
        }
  """
  aggregation_func = lambda result_datetime: (
      datetime.datetime(year = result_datetime.year,
                        month = result_datetime.month,
                        day = result_datetime.day))
  return _aggregate_results(results, aggregation_func)


def aggregate_by_hour_of_day(results):
  """ Aggregate test results by hour of day (e.g. all results from 2-3 PM are
      aggregated together, even if the results occurred on different days).
      Note that this differs from the aggregate_by_hour function.

      Args:
        results (list): A list of 2-tuples where the first entry is a datetime
          and the second is a float. For example:
          [(<datetime-2014-10-05>, 24.1), (<datetime-2014-11-02>, 90.2), ...]

      Returns:
        (dict) A dictionary of lists, keyed by int. Each key is the hour in
        which a result occurred (in the range 0...23). For example:
        {
          0: [24.1, 35.8, 16.6, ...],
          1: [92.2, 100.3, 23.0, ...],
          2: [18.0, 19.8, 97.6, ...],
          ...
        }
  """
  aggregation_func = lambda result_datetime: result_datetime.hour
  return _aggregate_results(results, aggregation_func)


def aggregate_by_hour_of_day_per_month(results):
  """ Aggregate test results by hour of day for each month (e.g. all results
      from 2-3 PM in March 2014 are aggregated together, even if they occurred
      on different days, while results from 2-3 PM in April 2014 are aggregated
      separately from the March 2014 results).

      Args:
        results (list): A list of 2-tuples where the first entry is a datetime
          and the second is a float. For example:
          [(<datetime-2014-10-05>, 24.1), (<datetime-2014-11-02>, 90.2), ...]

      Returns:
        (dict) A dictionary of lists, keyed by datetime. Each key is a datetime
        rounded to the first day of the month and to the start of the hour. For
        example:
        {
          <datetime-2014-10-01@00:00:00>: [24.1, 35.8, 16.6, ...],
          <datetime-2014-10-01@01:00:00>: [92.2, 100.3, 23.0, ...],
          <datetime-2014-10-01@02:00:00>: [18.2, 101.9, 9.2, ...],
          ...
          <datetime-2014-11-01@00:00:00>: [14.2, 84.2, 23.5, ...],
          <datetime-2014-11-01@01:00:00>: [86.3, 29.2, 18.0, ...],
          ...
        }
  """
  aggregation_func = lambda result_datetime: (
      datetime.datetime(year = result_datetime.year,
                        month = result_datetime.month,
                        day = 1,
                        hour = result_datetime.hour))
  return _aggregate_results(results, aggregation_func)


def aggregate_by_hour(results):
  """ Aggregate test results by hour (e.g. all results from 2-3 PM on
      2014/05/14 are aggregated together, all results from 3-4 PM on
      2014/05/14 are aggregated together).

      Args:
        results (list): A list of 2-tuples where the first entry is a datetime
          and the second is a float. For example:
          [(<datetime-2014-10-05>, 24.1), (<datetime-2014-11-02>, 90.2), ...]

      Returns:
        (dict) A dictionary of lists, keyed by datetime. Each key is a datetime
        rounded to the first day of the month and to the start of the hour. For
        example:
        {
          <datetime-2014-10-12@00:00:00>: [24.1, 35.8, 16.6, ...],
          <datetime-2014-10-12@01:00:00>: [92.2, 100.3, 23.0, ...],
          <datetime-2014-10-12@02:00:00>: [18.2, 101.9, 9.2, ...],
          ...
          <datetime-2014-11-03@00:00:00>: [14.2, 84.2, 23.5, ...],
          <datetime-2014-11-03@01:00:00>: [86.3, 29.2, 18.0, ...],
          ...
        }
  """
  aggregation_func = lambda result_datetime: (
      datetime.datetime(year = result_datetime.year,
                        month = result_datetime.month,
                        day = result_datetime.day,
                        hour = result_datetime.hour))
  return _aggregate_results(results, aggregation_func)


def _aggregate_results(results, aggregation_func):
  """ Aggregate test results according to the given aggregation function.

      Args:
        results (list): A list of 2-tuples where the first entry is a datetime
          and the second is a float. For example:
          [(<datetime-2014-10-05>, 24.1), (<datetime-2014-11-02>, 90.2), ...]

        aggregation_func (function): An aggregation function responsible for
        translating a datetime object into an aggregation key.

      Returns:
        (dict) A dictionary of lists, where each list includes all results in
        that aggregation unit (float values), keyed by whatever type
        aggregation_func outputs as an aggregation key.
  """
  aggregated_data = {}

  for result_datetime, value in results:
    aggregation_key = aggregation_func(result_datetime)
    try:
      aggregated_data[aggregation_key].append(value)
    except KeyError:
      aggregated_data[aggregation_key] = [value]

  return aggregated_data

