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

import argparse
import os
import sys

"""Configure Observatory based on the type of environment this is."""


def setup_environment(environment_type):
  link_name = 'static/js/observatory/js/paths.js'

  if os.path.exists(link_name):
    print 'Warning: Replacing existing file: %s' % link_name
    os.remove(link_name)

  if environment_type == 'staging':
    os.symlink('paths.js.staging', link_name)
  elif environment_type == 'live':
    os.symlink('paths.js.live', link_name)
  else:
    print 'Error: Invalid environment type'
    sys.exit(-1)


def main(args):
  setup_environment(args.environment_type)

if __name__ == '__main__':
  parser = argparse.ArgumentParser(
      prog='Observatory Environment Bootstrapper',
      formatter_class=argparse.ArgumentDefaultsHelpFormatter)
  parser.add_argument('environment_type',
                      choices=['staging', 'live'],
                      help='The type of environment to configure.')
  main(parser.parse_args())

