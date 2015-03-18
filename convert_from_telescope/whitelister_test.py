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

import unittest

import mock

import blacklister


def create_mock_reader(filename):
  """Creates a mock object to replace a TelescopeResultReader instance."""
  instance = mock.Mock()
  filename_parts = filename.split('_')
  instance.get_metadata.return_value = {
      'site_name': filename_parts[0],
      'isp': filename_parts[1],
      'metric_name': filename_parts[2],
      }
  return instance


def mock_has_enough_samples(dataset_key):
  """Mocks out the check for whether a dataset has sufficient samples."""
  mappings = {
      'lga01-comcast-download_throughput': True,
      'lga01-verizon-download_throughput': True,
      'mia02-comcast-download_throughput': False,
      'sea05-twc-download_throughput': False
      }
  return mappings[dataset_key]


class DataFileBlacklisterTest(unittest.TestCase):

  @mock.patch('telescope_data_parser.SingleTelescopeResultReader')
  def test_is_blacklisted(self, mock_result_reader):
    mock_result_reader.side_effect = create_mock_reader

    sample_checker = mock.Mock()
    sample_checker.has_enough_samples.side_effect = mock_has_enough_samples
    mock_filenames = ('lga01_comcast_download_throughput_1.csv',
                      'lga01_comcast_download_throughput_2.csv',
                      'lga01_verizon_download_throughput_1.csv',
                      'mia02_comcast_download_throughput_1.csv',
                      'sea05_twc_download_throughput_1.csv')
    file_blacklister = blacklister.DataFileBlacklister(sample_checker)
    file_blacklister.populate(mock_filenames)

    # These SHOULD NOT be blacklisted, as the mock sample checker says their
    # datasets have sufficient samples.
    self.assertFalse(file_blacklister.is_blacklisted(
        'lga01_comcast_download_throughput_1.csv'))
    self.assertFalse(file_blacklister.is_blacklisted(
        'lga01_comcast_download_throughput_2.csv'))
    self.assertFalse(file_blacklister.is_blacklisted(
        'lga01_verizon_download_throughput_1.csv'))

    # These SHOULD be blacklisted, as the mock sample checker says their
    # datasets do not have sufficient samples.
    self.assertTrue(file_blacklister.is_blacklisted(
        'mia02_comcast_download_throughput_1.csv'))
    self.assertTrue(file_blacklister.is_blacklisted(
        'sea05_twc_download_throughput_1.csv'))


if __name__ == '__main__':
  unittest.main()

