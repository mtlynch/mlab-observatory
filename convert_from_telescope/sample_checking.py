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

"""Check that Telescope datasets meet sample size thresholds."""

import collections
import logging

import aggregate
import telescope_data_parser


def setup_logger():
  logger = logging.getLogger('prepare-for-server')
  console_handler = logging.StreamHandler()
  logger.addHandler(console_handler)
  logger.setLevel(logging.INFO)


class SampleCounter(object):
  """Tracks the number of samples per day in a collection of datasets."""

  def __init__(self):
    self.sample_counts = collections.defaultdict(lambda: {})

  def add_to_counts(self, metadata, results):
    """Add result data to overall sample counts.

    Args:
      metadata: (dict) A dictionary of metadata describing the results data.
        Currently the only supported value for the 'metric' key is
        'download_throughput'.

      results: (list) A list of (datetime, value) pairs representing Telescope
        results for the given metadata.
    """
    counts_key = self._hash_key_from_metadata(metadata)

    aggregated_by_day = aggregate.aggregate_by_day(results)
    for day, values in aggregated_by_day.iteritems():
      current_count = self.sample_counts[counts_key].get(day, 0)
      self.sample_counts[counts_key][day] = current_count + len(values)

  def get_per_day_counts(self, metadata):
    hash_key = self._hash_key_from_metadata(metadata)
    return self.sample_counts[hash_key]

  def _hash_key_from_metadata(self, metadata):
    """Derives a key for a particular dataset based on supplied metadata.

    Args:
      metadata: (dict) A dictionary of metadata describing Telescope results.

    Returns:
      (str) Key of the form '[site]-[isp]-[metric]', for example:
      'lga01-comcast-minimum_rtt'.
    """
    hash_key = '%s-%s-%s' % (metadata['site_name'], metadata['isp'],
                             metadata['metric_name'])
    return hash_key


class SampleCountChecker(object):

  def __init__(self, sample_counter, sample_period_end,
               min_samples_per_day, percentage_of_days_threshold):
    """Checks whether sample counts for given dataset meet requirements.

    Args:
      sample_counter: (SampleCounter) Object tracking sample counts for each
        dataset.

      sample_period_end: (datetime.datetime) Time at which the relevant period
        of sample counts ends (i.e. samples after this date are not considered
        when checking against requirements). Note: There is no explicit
        sample_period_start because we use the earliest sample in the dataset
        as the implicit start of the sample period.

      min_samples_per_day: (int) The minimum number of samples a dataset must
        have in a day for the day to be considered statistically valid.

      percentage_of_days_threshold: (float) The percentage of days (e.g. 0.80)
        in a dataset that must meet the minimum number of per-day samples for
        the entire dataset to be considered statistically valid (e.g. if
        percentage is 0.80 and minimum samples is 50, then at least 80% of days
        must have >= 50 samples per day.
    """
    self._sample_counter = sample_counter
    self._sample_period_end = sample_period_end
    self._min_samples_per_day = min_samples_per_day
    self._percentage_of_days_threshold = percentage_of_days_threshold

  def has_enough_samples(self, metadata):
    """Indicates whether the specified dataset has sufficient samples.

    Indicates whether the dataset associated with the specified metadata has
    sufficient samples to meet sample count requirements.

    Args:
      metadata: (dict) A dictionary of values describing a dataset's metadata.

    Returns:
      (bool) True if the associated dataset has sufficient samples.
    """
    counts = self._sample_counter.get_per_day_counts(metadata)
    percentage_of_days_above_threshold = (
        self._get_percent_above_threshold(counts))

    return (percentage_of_days_above_threshold >=
            self._percentage_of_days_threshold)

  def _get_percent_above_threshold(self, counts):
    """Calculates the percentage of days in the dataset that meet requirements.

    Calculates the the percentage of days within the dataset that have >= the
    minimum number of per-day samples.

    Args:
      counts: (dict) A dictionary of sample counts, keyed by date. For example:
        { <datetime-2014-10-01>: 215, <datetime-2014-10-02>: 196, ... }

    Returns:
      (float) The percentage of days that meet the sample size requirements
      (e.g. 0.666666).
    """
    if not counts:
      return 0.0

    start_datetime = min(counts.keys())
    days_in_range = (self._sample_period_end - start_datetime).days
    num_above_threshold = 0
    for date, count in counts.iteritems():
      if date >= self._sample_period_end:
        continue
      if self._is_above_threshold(count):
        num_above_threshold += 1
    return float(num_above_threshold) / float(days_in_range)

  def _is_above_threshold(self, count):
    """Indicates whether the sample count meets the sample size threshold.

    Args:
      count: (int) Number of samples found in given day.

    Returns:
      (bool) True if the count is above the required sample threshold.
    """
    return count >= self._min_samples_per_day


class DataFileBlacklister(object):

  def __init__(self, sample_period_end,
               min_samples_per_day, percentage_of_days_threshold):
    """Checks whether sample counts for given files meet the sample thresholds.

    Args:
      sample_period_end: (datetime.datetime) Time at which the relevant period
        of sample counts ends (i.e. samples after this date are not considered
        when checking against requirements). Note: There is no explicit
        sample_period_start because we use the earliest sample in the dataset
        as the implicit start of the sample period.

      min_samples_per_day: (int) The minimum number of samples a dataset must
        have in a day for the day to be considered statistically valid.

      percentage_of_days_threshold: (float) The percentage of days (e.g. 0.80)
        in a dataset that must meet the minimum number of per-day samples for
        the entire dataset to be considered statistically valid (e.g. if
        percentage is 0.80 and minimum samples is 50, then at least 80% of days
        must have >= 50 samples per day.
    """
    self._logger = logging.getLogger('prepare-for-server')
    self._sample_counter = SampleCounter()
    self._sample_count_checker = SampleCountChecker(
        self._sample_counter, sample_period_end, min_samples_per_day,
        percentage_of_days_threshold)

  def populate(self, filenames):
    """Adds the provided filenames to blacklist database.

    Adds the provided file to the blacklist database by tracking
    the total data counts in each dataset (note that this supports
    adding multiple files to the same dataset and aggregating the
    results).

    Args:
      filenames: (list) A list of filenames to add to blacklist database.
    """
    for filename in filenames:
      self._logger.info('Analyzing %s for blacklist.', filename)
      self._add_file(filename)

  def is_blacklisted(self, filename):
    """Indicates whether a file is part of a blacklisted dataset.

    Args:
      filename: (str) Filename to evaluate.

    Returns:
      (bool) True if the given filename is blacklisted because it is part
      of a dataset that does not meet the sample size requirements.
    """
    result_reader = telescope_data_parser.SingleTelescopeResultReader(filename)
    metadata = result_reader.get_metadata()

    # This is a workaround because Observatory currently can't exclude datasets
    # on a per-metric basis, so we use download_throughput as a lowest common
    # denominator.
    metadata['metric_name'] = 'download_throughput'

    return self._sample_count_checker.has_enough_samples(metadata)

  def _add_file(self, filename):
    """Adds the provided filename to blacklist database.

    Adds the provided file to the blacklist database by tracking the total data
    counts in each dataset (note that this supports adding multiple files to
    the same dataset and aggregating the results).

    Args:
      filename: (str) Name of file to add to blacklist database.
    """
    result_reader = telescope_data_parser.SingleTelescopeResultReader(filename)
    metadata = result_reader.get_metadata()

    # This is a performance optimization due to the workaround in
    # is_blacklisted(). Because we don't use any metric except download
    # throughput, there is no need to waste time parsing the data for other
    # metrics.
    if metadata['metric_name'] != 'download_throughput':
      return

    with open(filename, 'r') as data_file:
      self._sample_counter.add_to_counts(metadata, result_reader)

