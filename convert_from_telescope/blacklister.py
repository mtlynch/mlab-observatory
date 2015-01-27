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

import telescope_data_parser


class DataFileBlacklister(object):

  def __init__(self, sample_count_checker):
    """Checks whether sample counts for given files meet the sample thresholds.

    Args:
      sample_count_checker: (SampleCountChecker) Object to check whether
        datasets meet sample count thresholds.
    """
    self._logger = logging.getLogger('telescope-convert')
    self._sample_count_checker = sample_count_checker

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

    return not self._sample_count_checker.has_enough_samples(dataset_key)

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
    self._sample_count_checker.add_to_counts(dataset_key, result_reader)

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

