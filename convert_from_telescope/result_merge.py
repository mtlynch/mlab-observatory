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


class TelescopeResultMerger(object):
  """Merges together a collection of TelescopeResultReader objects.

  Aggregates together multiple TelescopeResultReader objects based on
  metadata groupings.
  """

  def merge_results(self, result_readers):
    """Merges results based on result groups.

    Puts a list of Telescope result objects into groups, then merges each group
    into a single, merged result reader.

    Args:
      result_readers: (list) A list of TelescopeResultReader objects to be
      merged by group.

    Returns:
      (list) A list of MergedTelescopeResultReader objects where each object
      corresponds to a group of results.
    """
    reader_groups = collections.defaultdict(lambda: [])
    for result_reader in result_readers:
      key = self._create_group_key(result_reader.get_metadata())
      reader_groups[key].append(result_reader)
    merged_readers = []
    for result_reader_group in reader_groups.itervalues():
      merged_readers.append(telescope_data_parser.MergedTelescopeResultReader(
          result_reader_group))
    return merged_readers

  def _create_group_key(self, metadata):
    raise NotImplementedError('Subclasses must implement this function.')


class PerSiteTelescopeResultMerger(TelescopeResultMerger):
  """Groups Telescope results based on M-Lab site."""

  def _create_group_key(self, metadata):
    return '%s_%s' % (metadata['site_name'], metadata['isp'])


class PerMetroTelescopeResultMerger(TelescopeResultMerger):
  """Groups Telescope results based on site metro."""

  def _create_group_key(self, metadata):
    return '%s_%s' % (metadata['metro'].upper(), metadata['isp'])

