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
import whitelister


def setup_logger():
  logger = logging.getLogger('telescope-convert')
  console_handler = logging.StreamHandler()
  logger.addHandler(console_handler)
  logger.setLevel(logging.INFO)
  return logger


def read_whitelist(whitelist_filename):
  """Read the whitelist file."""
  with open(whitelist_filename) as whitelist_file:
    deserializer = whitelister.MetadataWhitelistSerializer()
    return deserializer.deserialize(whitelist_file)


def update_whitelist(whitelist_filename, sample_count_checker,
                     input_filenames):
  """Update the whitelist file with new datasets.

  Update the whitelist file to include any new datasets that currently meet the
  sample size requirements.

  Args:
    whitelist_filename: (str) Filename of whitelist file to update.
    sample_count_checker: (sample_checking.SampleCounter) Sample counter to
      check sample size requirements.
    input_filenames: (list) A list of filenames from which to find datasets to
      add to the whitelist.

  Returns:
    (whitelister.MetadataWhitelist) Updated whitelist object.
  """
  whitelist = read_whitelist(whitelist_filename)
  updater = whitelister.MetadataWhitelistUpdater(whitelist,
                                                 sample_count_checker)
  if updater.update(input_filenames):
    with open(whitelist_filename, 'w') as whitelist_file:
      serializer = whitelister.MetadataWhitelistSerializer()
      serializer.serialize(whitelist, whitelist_file)
  return whitelist


def filter_files(whitelist, input_filenames):
  """Filter out the inputs that do not meet sample size requirements.

  Preprocesses Telescope data files to filter out the result sets that do not
  meet sample size requirements.

  Args:
    whitelist: (whitelister.MetadataWhitelist) Whitelist to use for filtering.
    input_filenames: (list) Names of files to preprocess.

  Returns:
    (list) A list of filenames that meet the sample size requirements.
  """
  file_checker = whitelister.DataFileWhitelistChecker(whitelist)
  return [filename for filename in input_filenames
          if file_checker.is_whitelisted(filename)]


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

  if not args.no_whitelist_update:
    logger.info('Updating dataset whitelist.')
    now = datetime.datetime.utcnow()
    end_time = datetime.datetime(now.year, now.month, 1)

    min_samples_per_day = int(args.samples_per_day)
    percentage_of_days_threshold = float(args.percentage_valid_days)
    sample_checker = load_sample_count_checker(end_time, min_samples_per_day,
                                               percentage_of_days_threshold)
    sample_counter = sample_checking.SampleCounter()
    sample_checker = sample_checking.SampleCountChecker(
        sample_counter, end_time, min_samples_per_day,
        percentage_of_days_threshold)
    whitelist = update_whitelist(args.whitelist, sample_checker,
                                 args.data_files)
  else:
    whitelist = read_whitelist(args.whitelist)

  filtered_files = filter_files(whitelist, args.data_files)
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
  parser.add_argument('--samples_per_day', default='30',
                      help='Minimum number of samples required per day.')
  parser.add_argument('--percentage_valid_days', default='0.80',
                      help='Required percentage of valid days.')
  parser.add_argument('--whitelist',
                      default='../static/observatory/metadata/whitelist.txt',
                      help='Whitelist of datasets to include in results.')
  parser.add_argument('--no_whitelist_update', default=False,
                      action='store_true',
                      help=('Skips check that datasets meet sample count '
                            'minimums.'))
  main(parser.parse_args())

