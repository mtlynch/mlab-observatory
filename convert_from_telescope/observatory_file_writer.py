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


import csv


class ObservatoryFileWriter(object):
  """Writes data metrics into output files that Observatory can consume."""

  def __init__(self, metric_names):
    self._metric_field_names = []
    for metric_name in metric_names:
      self._metric_field_names.append(metric_name)
      self._metric_field_names.append(metric_name + '_n')

  def write_daily_datafile(self, daily_metrics, output_file):
    """Writes a CSV file of per-day metrics.

    Args:
      daily_metrics: (dict) A dictionary of metrics where the keys are datetime
        objects (one per day) and the values are a dictionary of metrics.
        For example:
        <datetime-2014-1-1>: {'average_rtt': 35.392, 'average_rtt_n': 26,
                              ...},
        <datetime-2014-1-2>: {'average_rtt': 38.012, 'average_rtt_n': 22,
                              ...},
        ...
      output_file: (file) Output file to write into.
    """
    daily_items = daily_metrics.items()
    for date, values in daily_items:
      values['year'] = date.year
      values['month'] = date.month
      values['day'] = date.day
    fields = ['month', 'day', 'year',]
    fields.extend(self._metric_field_names)
    self._write_output_file(daily_items, fields, output_file)

  def write_hourly_datafile(self, hourly_metrics, output_file):
    """Writes a CSV file of per-hour metrics.

    Writes a CSV file of metrics by hour per month (i.e. 24 bins
    for Jan-2014, 24 bins for Feb-2014, ...).

    Args:
      hourly_metrics: (dict) A dictionary of metrics where the keys are
        datetime objects (24 per month) and the values are a dictionary of
        metrics. For example:
        <datetime-2014-1-1@12am>: {'average_rtt': 35.392, ...},
        <datetime-2014-1-1@1am>: {'average_rtt': 38.012, ...},
        ...
        <datetime-2014-1-1@11pm>: {'average_rtt': 38.012, ...},
        <datetime-2014-2-1@12am>: {'average_rtt': 38.012, ...},
        ...
      output_file: (file) Output file to write into.
    """
    hourly_items = hourly_metrics.items()
    for date, values in hourly_items:
      values['month'] = date.month
      values['hour'] = date.hour
      values['year'] = date.year
    fields = ['month', 'hour', 'year',]
    fields.extend(self._metric_field_names)
    self._write_output_file(hourly_items, fields, output_file)

  def _write_output_file(self, metrics, fields, output_file):
    """Writes Observatory data to a CSV file, sorted by timestamp.

    Args:
      metrics: (list) A list of two-tuples of the form (timestamp, values)
        where timestamp is a datetime value and values is a dictionary of
        values keyed by field name. For example:
        ((<datetime-2014-10-01>, {'download_throughput': 18.22,
                                  'download_throughput_n': 293, ...}),
         (<datetime-2014-10-02>, {'download_throughput': 19.81,
                                  'download_throughput_n': 214, ...}),
         ...)
      fields: (list) A list of fields to write in each row of the output
        CSV.
      output_file: (file) Output file to write into.
    """
    # Sort items by timestamp before writing them.
    metrics.sort(key=lambda item: item[0])

    # Remove pre-2012 results (that have shifted because of timezone conversion)
    metrics = [item for item in metrics if item[0].year >= 2012]

    csv_writer = csv.DictWriter(output_file, fields)
    csv_writer.writeheader()
    for _, values in metrics:
      csv_writer.writerow(values)

