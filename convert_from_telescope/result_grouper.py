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

import collections

import telescope_data_parser


class TelescopeResultGrouper(object):
  """Groups together a collection of TelescopeResultReader objects.

  Groups together multiple TelescopeResultReader objects based on
  metadata groupings and allows them the group to be read as a single
  TelescopeResultReader object.
  """

  def group_results(self, result_readers):
    """Groups results based on result groups.

    Puts a list of Telescope result objects into groups, then merges each group
    into a single, merged result reader.

    Args:
      result_readers: (list) A list of TelescopeResultReader objects to be
      put into groups.

    Returns:
    (dict) A dictionary of results, keyed by group key, then by metric name.
    For example:
    {
      'lga01_comcast': {
        'download_throughput': [
          (<datetime-2014-10-01>, 24.5),
          (<datetime-2014-10-02>, 24.5),
          (<datetime-2014-10-03>, 24.5),
          ...
          ],
        'upload_throughput': ...,
        },
      'sea01_verizon': {
        'download_throughput': ...,
        'upload_throughput': ...,
        },
      'mia02_twc': ...,
      ...
    }
    """
    reader_groups = collections.defaultdict(
        lambda: collections.defaultdict(
            lambda: telescope_data_parser.MergedTelescopeResultReader()))
    for result_reader in result_readers:
      metadata = result_reader.get_metadata()
      key = self._create_group_key(metadata)
      metric_name = metadata['metric_name']
      reader_groups[key][metric_name].add_reader(result_reader)
    return reader_groups

  def _create_group_key(self, metadata):
    raise NotImplementedError('Subclasses must implement this function.')


class PerSiteTelescopeResultGrouper(TelescopeResultGrouper):
  """Groups Telescope results based on M-Lab site."""

  def _create_group_key(self, metadata):
    return '%s_%s' % (metadata['site_name'], metadata['isp'])


class PerMetroTelescopeResultGrouper(TelescopeResultGrouper):
  """Groups Telescope results based on site metro."""

  def _create_group_key(self, metadata):
    return '%s_%s' % (metadata['metro'].upper(), metadata['isp'])

