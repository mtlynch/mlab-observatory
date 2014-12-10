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

import pytz


def get_site_timezone(site_name):
  """Translates an M-Lab site's name into its associated timezone.

  Args:
    site_name: (str) Name of M-Lab site for which to retrieve associated
      timezone.

  Returns:
    (pytz.timezone) Timezone object associated with the site.
  """
  site_tz_map = {
      'ams': 'CET',
      'arn': 'CET',
      'ath': 'EET',
      'beg': 'CET',
      'dub': 'GMT',
      'ham': 'CET',
      'lba': 'CET',
      'lca': 'CET',
      'lhr': 'GMT',
      'lju': 'CET',
      'mad': 'CET',
      'mil': 'CET',
      'par': 'CET',
      'prg': 'CET',
      'svg': 'CET',
      'trn': 'CET',
      'vie': 'CET',
      'atl': 'US/Eastern',
      'dfw': 'US/Central',
      'iad': 'US/Eastern',
      'lax': 'US/Pacific',
      'lga': 'US/Eastern',
      'mia': 'US/Eastern',
      'nuq': 'US/Pacific',
      'ord': 'US/Central',
      'sea': 'US/Pacific',
      }
  metro = site_name[:3]
  return pytz.timezone(site_tz_map[metro])


def get_us_sites():
  # TODO(mtlynch): Replace this with something that doesn't need to be
  # maintained by hand.
  return ('atl01',
          'atl03',
          'atl04',
          'dfw01',
          'dfw02',
          'dfw05',
          'iad01',
          'iad02',
          'iad04',
          'lax01',
          'lax03',
          'lax05',
          'lga01',
          'lga02',
          'lga04',
          'mia01',
          'nuq01',
          'nuq02',
          'nuq03',
          'nuq04',
          'nuq06',
          'ord01',
          'ord02',
          'ord03',
          'ord04',
          'ord05',
          'sea01',
          'sea02',
          'sea03')
