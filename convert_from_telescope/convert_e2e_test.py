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

import difflib
import filecmp
import glob
import os
import shutil
import unittest

import convert
import observatory_file_writer
import reducer
import result_grouper

TESTDATA_DIR = 'testdata'
TEST_OUTPUT_DIR = 'testoutput'
GOLDEN_OUTPUT_DIR = 'testoutput-golden'


def clear_output_dir():
  """Remove all files from the test output path."""
  if os.path.exists(TEST_OUTPUT_DIR):
    shutil.rmtree(TEST_OUTPUT_DIR)


def _diff_dirs(left_dir, right_dir):
  """Create a diff of two directories.

  Generates a string that contains a diff of all files between two directories.

  Args:
    left_dir: (str) The path to the lefthand directory to compare.
    right_dir: (str) The path to the righthand directory to compare.

  Returns:
    (str) A diff-formatted string of the differences between the two
    directories, or '' if the two directories are identical.
  """
  dir_cmp = filecmp.dircmp(left_dir, right_dir)
  unified_diff = difflib.unified_diff
  diffs = []
  for left_only_file in dir_cmp.left_only:
    left_path = os.path.join(left_dir, left_only_file)
    right_path = os.path.join(right_dir, left_only_file)
    for diff in unified_diff(open(left_path).readlines(),
                             [],
                             left_path,
                             right_path):
      diffs.append(diff)
  for right_only_file in dir_cmp.right_only:
    left_path = os.path.join(left_dir, right_only_file)
    right_path = os.path.join(right_dir, right_only_file)
    for diff in unified_diff([],
                             open(right_path).readlines(),
                             left_path,
                             right_path):
      diffs.append(diff)
  for diff_file in dir_cmp.diff_files:
    left_path = os.path.join(left_dir, diff_file)
    right_path = os.path.join(right_dir, diff_file)
    for diff in unified_diff(open(left_path).readlines(),
                             open(right_path).readlines(),
                             left_path,
                             right_path):
      diffs.append(diff)
  for subdir_cmp in dir_cmp.subdirs.itervalues():
    diff = _diff_dirs(subdir_cmp.left, subdir_cmp.right)
    if diff:
      diffs.append(diff)

  if diffs:
    return '\n'.join(diffs)
  else:
    return ''


def _diff_test_output_against_golden():
  return _diff_dirs(GOLDEN_OUTPUT_DIR, TEST_OUTPUT_DIR)


class ResultConverterEndToEnd(unittest.TestCase):

  def setUp(self):
    clear_output_dir()
    self._input_filenames = glob.glob(os.path.join(TESTDATA_DIR, '*-raw.csv'))
    self._median_reducer = reducer.MedianReducer()
    self._file_writer = observatory_file_writer.ObservatoryFileWriter()

  def _create_per_site_converter(self):
    grouper = result_grouper.PerSiteTelescopeResultGrouper()
    output_dir = os.path.join(TEST_OUTPUT_DIR, 'exploreData')
    valid_keys_path = os.path.join(TEST_OUTPUT_DIR,
                                   'metadata/validExploreKeys.txt')
    return convert.ResultConverter(grouper,
                                   self._median_reducer,
                                   self._file_writer,
                                   output_dir,
                                   valid_keys_path)

  def _create_per_metro_converter(self):
    grouper = result_grouper.PerMetroTelescopeResultGrouper()
    output_dir = os.path.join(TEST_OUTPUT_DIR, 'compareData')
    valid_keys_path = os.path.join(TEST_OUTPUT_DIR,
                                   'metadata/validCompareKeys.txt')
    return convert.ResultConverter(grouper,
                                   self._median_reducer,
                                   self._file_writer,
                                   output_dir,
                                   valid_keys_path)

  def test_conversion_end_to_end(self):
    """Perform an end-to-end conversion of Telescope conversion.

    Runs both the per-site converter and the per-metro converter to convert
    the test data to Observatory format, then compares the output to the known
    good golden files and reports any differences. Note that we could test each
    converter independently, but this end-to-end test better matches the
    Telescope-to-Observatory converter's actual usage, in which the output
    directory contains the results of both conversions.
    """
    per_site_converter = self._create_per_site_converter()
    per_metro_converter = self._create_per_metro_converter()
    for converter in [per_site_converter, per_metro_converter]:
      converter.convert_to_observatory_format(self._input_filenames)

    diff_from_golden = _diff_test_output_against_golden()
    self.assertEqual('', diff_from_golden, diff_from_golden)


if __name__ == '__main__':

  unittest.main()
