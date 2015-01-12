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

"""Converts Telescope output files into data files for M-Lab Observatory."""

import argparse
import datetime
import logging
import os

import convert
import observatory_file_writer
import reducer
import result_grouper
import sample_checking


def setup_logger():
  logger = logging.getLogger('telescope-convert')
  console_handler = logging.StreamHandler()
  logger.addHandler(console_handler)
  logger.setLevel(logging.INFO)
  return logger


def filter_files(end_time, min_samples_per_day, percentage_of_days_threshold,
                 input_filenames):
  """Filter out the inputs that do not meet sample size requirements.

  Preprocesses Telescope data files to filter out the result sets that do not
  meet sample size requirements.

  Args:
    end_time: (datetime) End time for the evaluation window (the end of the
      time window in which we care about whether sample size requirements are
      met).
    min_samples_per_day: (int) The number of samples per day for a result set
      to be considered valid on that day.
    percentage_of_days_threshold: (float) The percentage of days that a result
      set must meet the sample size minimum for the set as a whole to
      blacklister considered valid (e.g. 0.8 => 80%).
    input_filenames: (list) Names of files to preprocess.

  Returns:
    (list) A list of filenames that meet the sample size requirements.
  """
  blacklister = sample_checking.DataFileBlacklister(
      end_time, min_samples_per_day, percentage_of_days_threshold)
  blacklister.populate(input_filenames)
  return [filename for filename in input_filenames
          if not blacklister.is_blacklisted(filename)]


def perform_conversion(input_filenames, output_dir):
  """Converts Telescope files to Observatory format.

  Args:
    input_filenames: (list) A list of raw Telescope output files to convert.
    output_dir: (str) Directory in which to place converted Observatory files.
  """
  median_reducer = reducer.MedianReducer()
  file_writer = observatory_file_writer.ObservatoryFileWriter()

  per_site_result_grouper = result_grouper.PerSiteTelescopeResultGrouper()
  per_site_output_dir = os.path.join(output_dir, 'data', 'exploreData')
  per_site_valid_keys_path = os.path.join(output_dir,
                                          'metadata',
                                          'validExploreKeys.txt')
  per_site_converter = convert.ResultConverter(per_site_result_grouper,
                                               median_reducer,
                                               file_writer,
                                               per_site_output_dir,
                                               per_site_valid_keys_path)

  per_metro_result_grouper = result_grouper.PerMetroTelescopeResultGrouper()
  per_metro_output_dir = os.path.join(output_dir, 'data', 'compareData')
  per_metro_valid_keys_path = os.path.join(output_dir,
                                           'metadata',
                                           'validCompareKeys.txt')
  per_metro_converter = convert.ResultConverter(per_metro_result_grouper,
                                                median_reducer,
                                                file_writer,
                                                per_metro_output_dir,
                                                per_metro_valid_keys_path)

  for converter in (per_site_converter, per_metro_converter):
    converter.convert_to_observatory_format(input_filenames)


def main(args):
  logger = setup_logger()
  program_start_time = datetime.datetime.utcnow()

  if not args.no_sample_count_check:
    now = datetime.datetime.utcnow()
    end_time = datetime.datetime(now.year, now.month, 1)

    min_samples_per_day = int(args.samples_per_day)
    percentage_of_days_threshold = float(args.percentage_valid_days)
    filtered_files = filter_files(end_time,
                                  min_samples_per_day,
                                  percentage_of_days_threshold,
                                  args.data_files)
  else:
    filtered_files = args.data_files

  perform_conversion(filtered_files, args.output)
  program_end_time = datetime.datetime.utcnow()
  runtime_mins = (program_end_time - program_start_time).total_seconds() / 60.0
  logger.info('Conversion completed in %.1f minutes.', runtime_mins)

if __name__ == '__main__':
  parser = argparse.ArgumentParser(
      prog='Observatory Data Preparation Tool',
      formatter_class=argparse.ArgumentDefaultsHelpFormatter)
  parser.add_argument('data_files', nargs='+', default=None,
                      help='CSV datafile(s) to merge.')
  parser.add_argument('-o', '--output', default='../static/observatory/',
                      help='Output path.')
  parser.add_argument('--samples_per_day', default='50',
                      help='Minimum number of samples required per day.')
  parser.add_argument('--percentage_valid_days', default='0.80',
                      help='Required percentage of valid days.')
  parser.add_argument('--no_sample_count_check', default=False,
                      action='store_true',
                      help=('Skips check that datasets meet sample count '
                            'minimums.'))
  main(parser.parse_args())

