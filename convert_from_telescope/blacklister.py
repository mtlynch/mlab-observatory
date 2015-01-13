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

import logging

import sample_checking
import telescope_data_parser


def setup_logger():
  logger = logging.getLogger('prepare-for-server')
  console_handler = logging.StreamHandler()
  logger.addHandler(console_handler)
  logger.setLevel(logging.INFO)


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
    self._logger = logging.getLogger('telescope-convert')
    self._sample_counter = sample_checking.SampleCounter()
    self._sample_count_checker = sample_checking.SampleCountChecker(
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
    dataset_key = self._dataset_key_from_metadata(metadata)

    return self._sample_count_checker.has_enough_samples(dataset_key)

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

    dataset_key = self._dataset_key_from_metadata(metadata)
    with open(filename, 'r') as data_file:
      self._sample_counter.add_to_counts(dataset_key, result_reader)

  def _dataset_key_from_metadata(self, metadata):
    """Derives a key for a particular dataset based on supplied metadata.

    Args:
      metadata: (dict) A dictionary of metadata describing Telescope results.

    Returns:
      (str) Key of the form '[site]-[isp]-[metric]', for example:
      'lga01-comcast-minimum_rtt'.
    """
    dataset_key = '%s-%s-%s' % (metadata['site_name'], metadata['isp'],
                                metadata['metric_name'])
    return dataset_key

