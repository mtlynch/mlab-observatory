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

import io
import unittest

import mock

import whitelister


class MetadataWhitelistTest(unittest.TestCase):

  def test_is_whitelisted(self):
    site_name = 'lga01'
    isp = 'verizon'
    whitelist = whitelister.MetadataWhitelist()

    # Verify that the empty whitelist does not claim a dataset is whitelisted.
    self.assertFalse(whitelist.is_whitelisted(site_name, isp))

    # Verify that a dataset is whitelisted after being added to the whitelist.
    whitelist.add(site_name, isp)
    self.assertTrue(whitelist.is_whitelisted(site_name, isp))

    # Verify that other datasets are not whitelisted.
    self.assertFalse(whitelist.is_whitelisted('lax02', isp))
    self.assertFalse(whitelist.is_whitelisted(site_name, 'twc'))


class MetadataWhitelistSerializerTest(unittest.TestCase):

  def setUp(self):
    self._serializer = whitelister.MetadataWhitelistSerializer()
    self._mock_file = io.BytesIO()

  def test_serialize_empty_whitelist(self):
    empty_whitelist = whitelister.MetadataWhitelist()
    self._serializer.serialize(empty_whitelist, self._mock_file)
    self.assertEqual('', self._mock_file.getvalue())

  def test_serialize_basic_whitelist(self):
    whitelist = whitelister.MetadataWhitelist()
    whitelist.add('lga01', 'verizon')
    whitelist.add('lga01', 'cablevision')
    whitelist.add('lax02', 'twc')
    whitelist.add('ord02', 'at&t')
    self._serializer.serialize(whitelist, self._mock_file)
    serialized_expected = ('lax02_twc\n'
                           'lga01_cablevision\n'
                           'lga01_verizon\n'
                           'ord02_at&t')
    self.assertEqual(serialized_expected, self._mock_file.getvalue())

  def test_deserialize_basic_whitelist(self):
    deserializer = whitelister.MetadataWhitelistSerializer()
    self._mock_file = io.BytesIO(('lax02_twc\n'
                                  'lga01_cablevision\n'
                                  'lga01_verizon\n'
                                  'ord02_at&t'))
    whitelist = deserializer.deserialize(self._mock_file)
    self.assertTrue(whitelist.is_whitelisted('lax02', 'twc'))
    self.assertTrue(whitelist.is_whitelisted('lga01', 'cablevision'))
    self.assertTrue(whitelist.is_whitelisted('lga01', 'verizon'))
    self.assertTrue(whitelist.is_whitelisted('ord02', 'at&t'))


def create_mock_reader(filename):
  """Creates a mock object to replace a TelescopeResultReader instance."""
  instance = mock.Mock()
  filename_parts = filename.split('-')
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


class MetadataWhitelistUpdaterTest(unittest.TestCase):

  @mock.patch('telescope_data_parser.SingleTelescopeResultReader')
  def test_update_add_new(self, mock_result_reader):
    """Verify that update() adds new datasets when they meet requirements."""
    mock_result_reader.side_effect = create_mock_reader

    # Set the initial whitelist to contain lga01-verizon
    whitelist = whitelister.MetadataWhitelist()
    whitelist.add('lga01', 'verizon')

    sample_checker = mock.Mock()
    sample_checker.has_enough_samples.side_effect = mock_has_enough_samples
    mock_filenames = ('lga01-comcast-download_throughput-1.csv',
                      'lga01-comcast-download_throughput-2.csv',
                      'lga01-verizon-download_throughput-1.csv',
                      'mia02-comcast-download_throughput-1.csv',
                      'sea05-twc-download_throughput-1.csv')

    updater = whitelister.MetadataWhitelistUpdater(whitelist, sample_checker)
    self.assertTrue(updater.update(mock_filenames))

    # lga01-comcast has enough samples, so it should be added to the whitelist.
    self.assertTrue(whitelist.is_whitelisted('lga01', 'comcast'))

    # lga01-verizon was already in the whitelist and should remain there.
    self.assertTrue(whitelist.is_whitelisted('lga01', 'verizon'))

    # mia02-comcast and sea05-twc do not have enough samples and should not be
    # in the whitelist.
    self.assertFalse(whitelist.is_whitelisted('mia02', 'comcast'))
    self.assertFalse(whitelist.is_whitelisted('sea05', 'twc'))

  @mock.patch('telescope_data_parser.SingleTelescopeResultReader')
  def test_update_maintain_existing(self, mock_result_reader):
    """Verify that update does not remove datasets from the whitelist."""
    mock_result_reader.side_effect = create_mock_reader

    # Set the initial whitelist to contain sea05-twc
    whitelist = whitelister.MetadataWhitelist()
    whitelist.add('sea05', 'twc')

    sample_checker = mock.Mock()
    sample_checker.has_enough_samples.side_effect = mock_has_enough_samples
    mock_filenames = ('sea05-twc-download_throughput-1.csv',)

    updater = whitelister.MetadataWhitelistUpdater(whitelist, sample_checker)
    updater.update(mock_filenames)

    # Even though sea05-twc does not meet sample size requirements, it was
    # initially in the whitelist and therefore should remain whitelisted.
    self.assertTrue(whitelist.is_whitelisted('sea05', 'twc'))


class DataFileWhitelistCheckerTest(unittest.TestCase):

  @mock.patch('telescope_data_parser.SingleTelescopeResultReader')
  def test_is_whitelisted(self, mock_result_reader):
    mock_result_reader.side_effect = create_mock_reader

    whitelist = whitelister.MetadataWhitelist()
    whitelist.add('lga01', 'verizon')
    whitelist.add('nuq01', 'comcast')

    checker = whitelister.DataFileWhitelistChecker(whitelist)
    # This file should not be whitelisted as lga01-comcast is not whitelisted.
    self.assertFalse(checker.is_whitelisted(
        'lga01-comcast-download_throughput-1.csv'))

    # These files should be whitelisted because their associated metadata
    # attributes are whitelisted.
    self.assertTrue(checker.is_whitelisted(
        'lga01-verizon-download_throughput-1.csv'))
    self.assertTrue(checker.is_whitelisted(
        'lga01-verizon-minimum_rtt-1.csv'))
    self.assertTrue(checker.is_whitelisted(
        'nuq01-comcast-download_throughput-3.csv'))


if __name__ == '__main__':
  unittest.main()

