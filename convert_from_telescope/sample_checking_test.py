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

from datetime import datetime as dt
import unittest

import mock

import sample_checking


class SampleCounterTest(unittest.TestCase):

  def setUp(self):
    self.results_a = [[dt(2014, 1, 1, 0, 0, 0), 2.0],
                      [dt(2014, 1, 1, 0, 5, 0), 3.0],
                      [dt(2014, 1, 1, 23, 59, 59), 12.9],
                      [dt(2014, 1, 2, 5, 19, 23), 23.2],
                      [dt(2014, 3, 9, 15, 11, 2), 22.1],]
    self.metadata_a = {'isp': 'att', 'site_name': 'mia01',
                       'metric_name': 'download_throughput'}
    self.results_b = [[dt(2014, 1, 1, 0, 0, 0), 2.0],
                      [dt(2014, 1, 2, 5, 19, 23), 23.2],
                      [dt(2013, 11, 12, 23, 11, 2), 22.1],]
    self.metadata_b = {'isp': 'att', 'site_name': 'mia01',
                       'metric_name': 'download_throughput'}
    self.sample_counter = sample_checking.SampleCounter()

  def test_simple_count_per_day_test(self):
    self.sample_counter.add_to_counts(self.metadata_a, self.results_a)
    counts_per_day_expected = {
        dt(2014, 1, 1): 3,
        dt(2014, 1, 2): 1,
        dt(2014, 3, 9): 1,
        }
    counts_per_day_actual = self.sample_counter.get_per_day_counts(
        self.metadata_a)
    self.assertDictEqual(counts_per_day_expected, counts_per_day_actual)

  def test_merged_count_per_day_test(self):
    self.sample_counter.add_to_counts(self.metadata_a, self.results_a)
    self.sample_counter.add_to_counts(self.metadata_b, self.results_b)
    counts_per_day_expected = {
        dt(2013, 11, 12): 1,
        dt(2014, 1, 1): 4,
        dt(2014, 1, 2): 2,
        dt(2014, 3, 9): 1,
        }
    counts_per_day_actual = self.sample_counter.get_per_day_counts(
        self.metadata_a)
    self.assertDictEqual(counts_per_day_expected, counts_per_day_actual)

  def test_independent_datasets_do_not_get_merged(self):
    results = {}
    results[0] = [[dt(2014, 1, 1, 0, 0, 0), 0.1],]
    results[1] = [[dt(2014, 1, 1, 0, 0, 0), 1.0],]
    results[2] = [[dt(2014, 1, 1, 0, 0, 0), 2.0],]
    results[3] = [[dt(2014, 1, 1, 0, 0, 0), 3.0],]

    metadata = {}
    metadata[0] = {'isp': 'att', 'site_name': 'mia01',
                   'metric_name': 'download_throughput'}
    metadata[1] = {'isp': 'att', 'site_name': 'mia01',
                   'metric_name': 'minimum_rtt'}
    metadata[2] = {'isp': 'att', 'site_name': 'lga01',
                   'metric_name': 'download_throughput'}
    metadata[3] = {'isp': 'comcast', 'site_name': 'mia01',
                   'metric_name': 'download_throughput'}

    counts_per_day_expected = {}
    counts_per_day_expected[0] = {dt(2014, 1, 1): 1}
    counts_per_day_expected[1] = {dt(2014, 1, 1): 1}
    counts_per_day_expected[2] = {dt(2014, 1, 1): 1}
    counts_per_day_expected[3] = {dt(2014, 1, 1): 1}

    # Add all Telescope results to sample counter
    for i in range(len(results)):
      self.sample_counter.add_to_counts(metadata[i], results[i])

    # Check that counts per day matches for each dataset
    for i in range(len(results)):
      counts_per_day_actual = self.sample_counter.get_per_day_counts(
          metadata[i])
      self.assertDictEqual(counts_per_day_expected[i], counts_per_day_actual)


class SampleCountCheckerTest(unittest.TestCase):

  def test_returns_true_when_enough_samples(self):
    mock_sample_counter = mock.Mock()
    mock_sample_counter.get_per_day_counts.return_value = {
        dt(2014, 10, 27): 50,
        dt(2014, 10, 28): 49,
        dt(2014, 10, 29): 55,
        dt(2014, 10, 30): 58,
        dt(2014, 10, 31): 50,
        }
    checker = sample_checking.SampleCountChecker(
        mock_sample_counter, dt(2014, 11, 1), min_samples_per_day=50,
        percentage_of_days_threshold=0.8)
    mock_metadata = None
    self.assertTrue(checker.has_enough_samples(mock_metadata))

  def test_returns_false_when_insufficient_samples(self):
    mock_sample_counter = mock.Mock()
    mock_sample_counter.get_per_day_counts.return_value = {
        dt(2014, 10, 27): 49,
        dt(2014, 10, 28): 49,
        dt(2014, 10, 29): 55,
        dt(2014, 10, 30): 58,
        dt(2014, 10, 31): 50,
        }
    checker = sample_checking.SampleCountChecker(
        mock_sample_counter, dt(2014, 11, 1), min_samples_per_day=50,
        percentage_of_days_threshold=0.8)
    mock_metadata = None
    self.assertFalse(checker.has_enough_samples(mock_metadata))

  def test_ignores_samples_beyond_date_range(self):
    """Verify that samples outside of the date range are not counted."""
    mock_sample_counter = mock.Mock()
    mock_sample_counter.get_per_day_counts.return_value = {
        dt(2014, 10, 27): 50,
        dt(2014, 10, 28): 49,
        dt(2014, 10, 29): 55,
        dt(2014, 10, 30): 58,
        dt(2014, 10, 31): 50,
        dt(2014, 11, 1): 1,
        }
    checker = sample_checking.SampleCountChecker(
        mock_sample_counter, dt(2014, 11, 1), min_samples_per_day=50,
        percentage_of_days_threshold=0.8)
    mock_metadata = None
    self.assertTrue(checker.has_enough_samples(mock_metadata))

  def test_zero_missing_days_in_range(self):
    """Verify datasets with missing days count those days as 0 samples."""
    mock_sample_counter = mock.Mock()
    mock_sample_counter.get_per_day_counts.return_value = {
        dt(2014, 10, 26): 49,
        dt(2014, 10, 27): 50,
        dt(2014, 10, 28): 51,
        dt(2014, 10, 29): 55,
        dt(2014, 10, 30): 58,
        # 10/31 is missing and should count as 0 samples
        }
    checker = sample_checking.SampleCountChecker(
        mock_sample_counter, dt(2014, 11, 1), min_samples_per_day=50,
        percentage_of_days_threshold=0.8)
    mock_metadata = None
    self.assertFalse(checker.has_enough_samples(mock_metadata))

if __name__ == '__main__':
  unittest.main()

