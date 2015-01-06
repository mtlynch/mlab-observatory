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

import unittest
import mock

import result_merge


def _get_mock_readers():
  mock_readers = [mock.Mock() for _ in range(7)]
  mock_readers[0].get_metadata.return_value = {
      'site_name': 'lga01',
      'metro': 'lga',
      'isp': 'comcast',
      'metric_name': 'download_throughput',
      }
  mock_readers[1].get_metadata.return_value = {
      'site_name': 'lga01',
      'metro': 'lga',
      'isp': 'comcast',
      'metric_name': 'download_throughput',
      }
  mock_readers[2].get_metadata.return_value = {
      'site_name': 'lga01',
      'metro': 'lga',
      'isp': 'comcast',
      'metric_name': 'average_rtt',
      }
  mock_readers[3].get_metadata.return_value = {
      'site_name': 'sea01',
      'metro': 'sea',
      'isp': 'verizon',
      'metric_name': 'upload_throughput',
      }
  mock_readers[4].get_metadata.return_value = {
      'site_name': 'sea01',
      'metro': 'sea',
      'isp': 'verizon',
      'metric_name': 'upload_throughput',
      }
  mock_readers[5].get_metadata.return_value = {
      'site_name': 'sea01',
      'metro': 'sea',
      'isp': 'comcast',
      'metric_name': 'download_throughput',
      }
  mock_readers[6].get_metadata.return_value = {
      'site_name': 'sea02',
      'metro': 'sea',
      'isp': 'comcast',
      'metric_name': 'download_throughput',
      }
  return mock_readers

class PerSiteTelescopeResultMergerTest(unittest.TestCase):

  def test_merge_readers_by_site(self):
    merger = result_merge.PerSiteTelescopeResultMerger()
    merged_readers = merger.merge_results(_get_mock_readers())

    keys_expected = ('lga01_comcast', 'sea01_comcast', 'sea01_verizon',
                     'sea02_comcast')
    self.assertItemsEqual(keys_expected, merged_readers.keys())
    self.assertItemsEqual(('download_throughput', 'average_rtt'),
                          merged_readers['lga01_comcast'].keys())
    self.assertItemsEqual(('download_throughput',),
                          merged_readers['sea01_comcast'].keys())
    self.assertItemsEqual(('upload_throughput',),
                          merged_readers['sea01_verizon'].keys())
    self.assertItemsEqual(('download_throughput',),
                          merged_readers['sea02_comcast'].keys())


class PerMetroTelescopeResultMergerTest(unittest.TestCase):

  def test_merge_readers_by_metro(self):
    merger = result_merge.PerMetroTelescopeResultMerger()
    merged_readers = merger.merge_results(_get_mock_readers())

    keys_expected = ('LGA_comcast', 'SEA_comcast', 'SEA_verizon')
    self.assertItemsEqual(keys_expected, merged_readers.keys())
    self.assertItemsEqual(('download_throughput', 'average_rtt'),
                          merged_readers['LGA_comcast'].keys())
    self.assertItemsEqual(('download_throughput',),
                          merged_readers['SEA_comcast'].keys())
    self.assertItemsEqual(('upload_throughput',),
                          merged_readers['SEA_verizon'].keys())


if __name__ == '__main__':
  unittest.main()

