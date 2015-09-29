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


def get_metro_timezone(metro):
    """Translates an metro name into its associated timezone.

  Args:
    metro: (str) Name of M-Lab metro for which to retrieve associated
      timezone.

  Returns:
    (pytz.timezone) Timezone object associated with the metro.
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
        'den': 'US/Mountain',
        'iad': 'US/Eastern',
        'lax': 'US/Pacific',
        'lga': 'US/Eastern',
        'mia': 'US/Eastern',
        'nuq': 'US/Pacific',
        'ord': 'US/Central',
        'sea': 'US/Pacific',
    }
    return pytz.timezone(site_tz_map[metro.lower()])
