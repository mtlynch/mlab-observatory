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
"""Determine which input files should be processed for Observatory."""

import logging
import os

import telescope_data_parser


class MetadataWhitelist(object):
    """Whitelist of datasets based on metadata attributes."""

    def __init__(self):
        self._whitelisted_keys = set()

    def __iter__(self):
        for key in self._whitelisted_keys:
            yield key

    def is_whitelisted(self, site_name, isp):
        """Indicates if the given dataset is whitelisted."""
        key = self._dataset_key_from_metadata(site_name, isp)
        return key in self._whitelisted_keys

    def add(self, site_name, isp):
        """Adds a dataset to the whitelist."""
        key = self._dataset_key_from_metadata(site_name, isp)
        self._whitelisted_keys.add(key)

    def _dataset_key_from_metadata(self, site_name, isp):
        """Derives a key for a particular dataset

        Derives a whitelist key for a dataset based on metadata attributes.

        Args:
            site_name: (str) The name of the M-Lab site (e.g. 'lga01').
            isp: (str) The name of the client ISP (e.g. 'verizon').

        Returns:
            (str) Key of the form '[site]_[isp]', for example: 'lga01_verizon'.
        """
        return '%s_%s' % (site_name, isp)


class MetadataWhitelistSerializer(object):
    """Converts a whitelist to/from a file."""

    def serialize(self, whitelist, output_file):
        """Serialize a whitelist to a file.

    Args:
      whitelist: (MetadataWhitelist) Whitelist to serialize.
      output_file: (file) File object to which to write the serialized data.
    """
        keys_sorted = sorted(whitelist)
        output_file.write(os.linesep.join(keys_sorted))

    def deserialize(self, whitelist_file):
        """Parses a whitelist from a file.

    Args:
      whitelist_file: (file) File object from which to parse the whitelist.

    Returns:
      (MetadataWhitelist) Whitelist parsed from the file.
    """
        whitelist = MetadataWhitelist()
        for line in whitelist_file:
            site_name, isp = line.strip().split('_')
            whitelist.add(site_name, isp)
        return whitelist


class MetadataWhitelistUpdater(object):
    """Updates the whitelist with new datasets that meet sample requirements.

    The update process keeps all the datasets that are currently in the
    whitelist because Observatory should not unpublish datasets that have
    previously been published. Updating checks all other datasets to see if
    there are new datasets that now meet sample size thresholds (either because
    they did not exist at the last check or their sample count has increased to
    meet requirements).
    """

    def __init__(self, existing_whitelist, sample_count_checker):
        """Creates a new whitelist updater.

        Args:
            existing_whitelist: (MetadataWhitelist) Current whitelist before
                adding new datasets.
            sample_count_checker: (SampleCountChecker) Object to check whether
                datasets meet sample count thresholds.
        """
        self.whitelist = existing_whitelist
        self._logger = logging.getLogger('telescope-convert')
        self._sample_count_checker = sample_count_checker
        self._checked_datasets = {}

    def update(self, filenames):
        """Updates whitelist by checking sample counts of provided datasets.

        Args:
          filenames: (list) A list of Telescope data files. Any datasets
              contained in these files will be added to the whitelist if the
              dataset meets sample count requirements.

        Returns:
          (bool) True if datasets were added to the whitelist.
        """
        added_new_datasets = False

        # Check sample counts for all non-whitelisted datasets.
        for filename in filenames:
            self._check_file(filename)

        # Go through the analyzed datasets and add any datasets to the whitelist if
        # they have sufficient samples.
        for key, metadata in self._checked_datasets.iteritems():
            if self._sample_count_checker.has_enough_samples(key):
                site_name = metadata['site_name']
                isp = metadata['isp']
                self.whitelist.add(site_name, isp)
                self._logger.info('Adding new dataset to whitelist: %s_%s',
                                  site_name, isp)
                added_new_datasets = True

        return added_new_datasets

    def _check_file(self, filename):
        """Analyze a data file to see if it should be whitelisted.

        Args:
            filename: (str) Filename of Telescope data file to check.
        """
        self._logger.info('Checking file for whitelist: %s', filename)
        result_reader = telescope_data_parser.SingleTelescopeResultReader(
            filename)
        metadata = result_reader.get_metadata()

        # Because we don't use any metric except download throughput, there is no
        # need to waste time parsing the data for other metrics.
        if metadata['metric_name'] != 'download_throughput':
            return

        # We don't need to check files that are already whitelisted.
        if self.whitelist.is_whitelisted(metadata['site_name'],
                                         metadata['isp']):
            return

        dataset_key = self._dataset_key_from_metadata(metadata)
        self._sample_count_checker.add_to_counts(dataset_key, result_reader)
        self._checked_datasets[dataset_key] = metadata

    def _dataset_key_from_metadata(self, metadata):
        """Derives a key for a particular dataset based on supplied metadata.

        Args:
            metadata: (dict) A dictionary of metadata describing Telescope
                results.

        Returns:
            (str) Key of the form '[site]-[isp]-[metric]', for example:
            'lga01-comcast-minimum_rtt'.
        """
        dataset_key = '%s-%s-%s' % (metadata['site_name'], metadata['isp'],
                                    metadata['metric_name'])
        return dataset_key


class DataFileWhitelistChecker(object):

    def __init__(self, whitelist):
        """Checks whether sample counts for given files meet the sample thresholds.

        Args:
            whitelist: (MetadataWhitelist) Whitelist to use to check files.
        """
        self._whitelist = whitelist

    def is_whitelisted(self, filename):
        """Indicates whether a file is part of a whitelisted dataset.

        Args:
            filename: (str) Filename to evaluate.

        Returns:
            (bool) True if the given filename is whitelisted because it is part
            of a dataset that meets the sample size requirements.
        """
        result_reader = telescope_data_parser.SingleTelescopeResultReader(
            filename)
        metadata = result_reader.get_metadata()

        return self._whitelist.is_whitelisted(metadata['site_name'],
                                              metadata['isp'])
