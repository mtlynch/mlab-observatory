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

"""Module to reduce sets of results to their aggregate values.

This module provides classes that take a collection of Telescope results and
aggregate them to a single value and sample count.
"""

import collections

import numpy

import aggregate


class MedianReducer(object):
  """Reduces a set of raw metrics to their median values.

  Reduces a set of raw metrics to their median value within a given window of
  time (e.g. a day, an hour) and, for each time unit, outputs the median value
  and the sample count.
  """

  def reduce_by_day(self, metrics_raw):
    """Reduces metrics to their median values per day."""
    return self._reduce(metrics_raw, aggregate.aggregate_by_day)

  def reduce_by_hour_of_day_per_month(self, metrics_raw):
    """Reduces metrics to their median values by hour of day per month."""
    return self._reduce(metrics_raw,
                        aggregate.aggregate_by_hour_of_day_per_month)

  def _reduce(self, metrics_raw, aggregation_func):
    """Reduces raw metrics to their median values and count.

    Calculates median values for raw metric values, aggregated according
    to the given aggregation function.

    Args:
      metrics_raw: (dict) A dictionary of metrics and their corresponding
        value lists, for example:
        {
         'download_throughput': ((<datetime-2012-04-05@15:28:02>, 12.192),
                                 (<datetime-2013-08-01@03:29:15>, 13.012),
                                 ...)
         'upload_throughput': ((<datetime-2012-04-05@15:28:02>, 2.502),
                               (<datetime-2013-08-01@03:29:15>, 8.689),
                                ...)
         ...
        }
      aggregation_func: (function) The function to apply to the value lists
        to aggregate the data.

     Returns:
       (dict) A dictionary where the keys are datetime objects representing
       the time buckets in which the data has been aggregated and the values
       are dictionaries of metrics containing the metric median and sample
       count. For example:
       {
         <datetime-2014-10-01>: { 'download_throughput': 15.89,
                                  'download_throughput_n': 128,
                                  'upload_throughput': 2.942,
                                  'upload_throughput_n': 115,
                                  ... }
         <datetime-2014-10-02>: ...
       }
    """
    metrics_aggregated = collections.defaultdict(lambda: {})
    for metric, rows_raw in metrics_raw.iteritems():
      for time, values in aggregation_func(rows_raw).iteritems():
        metrics_aggregated[time][metric] = numpy.median(values)
        metrics_aggregated[time][metric + '_n'] = len(values)
    return metrics_aggregated

