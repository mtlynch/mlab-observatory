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

import result_grouper


class PerSiteTelescopeResultGrouperTest(unittest.TestCase):

  def test_group_readers_by_site(self):
    mock_readers = [mock.Mock() for _ in range(5)]
    mock_readers[0].get_metadata.return_value = {
        'site_name': 'lga01', 'isp': 'comcast'}
    mock_readers[1].get_metadata.return_value = {
        'site_name': 'lga01', 'isp': 'comcast'}
    mock_readers[2].get_metadata.return_value = {
        'site_name': 'sea01', 'isp': 'verizon'}
    mock_readers[3].get_metadata.return_value = {
        'site_name': 'sea01', 'isp': 'verizon'}
    mock_readers[4].get_metadata.return_value = {
        'site_name': 'sea01', 'isp': 'comcast'}

    grouper = result_grouper.PerSiteTelescopeResultGrouper()
    grouped_readers = grouper.group_results(mock_readers)

    # Readers should be grouped into three merged readers: lga01-comcast,
    # sea01-comcast, and sea01-verizon.
    self.assertEqual(3, len(grouped_readers))


class PerMetroTelescopeResultGrouperTest(unittest.TestCase):

  def test_group_readers_by_metro(self):
    mock_readers = [mock.Mock() for _ in range(5)]
    mock_readers[0].get_metadata.return_value = {
        'metro': 'lga', 'isp': 'comcast'}
    mock_readers[1].get_metadata.return_value = {
        'metro': 'lga', 'isp': 'comcast'}
    mock_readers[2].get_metadata.return_value = {
        'metro': 'lga', 'isp': 'comcast'}
    mock_readers[3].get_metadata.return_value = {
        'metro': 'sea', 'isp': 'verizon'}
    mock_readers[4].get_metadata.return_value = {
        'metro': 'sea', 'isp': 'comcast'}

    grouper = result_grouper.PerMetroTelescopeResultGrouper()
    grouped_readers = grouper.group_results(mock_readers)

    # Readers should be grouped into three merged readers: lga-comcast,
    # sea-comcast, and sea-verizon.
    self.assertEqual(3, len(grouped_readers))


if __name__ == '__main__':
  unittest.main()

