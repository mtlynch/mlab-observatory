import os
import re
import csv
import json
import urllib2
import datetime
import pprint
import numpy as np
from pytz import timezone
from datetime import timedelta


inputFolder = 'newOut2014-10-24/'
outputFolder = 'yearAgg2014-10-24/'
dayMap = {
	"2012": 366,
	"2013": 365,
	"2014": 273
}
def readCombos():
	validIDs = {}
	reader = csv.reader(open('validCombs.csv','rU'))
	header = next(reader, None)
	print(header)
	for row in reader:
		id = row[2] + "_" + row[3]
		if id not in validIDs:
			validIDs[id] = []
		validIDs[id].append(row[0])

	print(validIDs)
	validKeys = open(outputFolder + 'validKeys.txt', 'w+')
	for key,years in validIDs.iteritems():
		validKeys.write(key + "\n");
		daily = open(outputFolder + key + '_daily.csv', 'w')
		hourly = open(outputFolder + key + '_hourly.csv', 'w')
		yearIndex = 0
		for year in years:
			days = dayMap[year]
			dailyDataFile = open(inputFolder + year + '-01-01-000000+' + str(days) + 'd_' + key + '_daily.csv' )
			if yearIndex is not 0:
				dailyDataFile.readline()
			dailyData = dailyDataFile.read()
			daily.write(dailyData)
			hourlyDataFile = open(inputFolder + year + '-01-01-000000+' + str(days) + 'd_' + key + '_hourly.csv')
			if yearIndex is not 0:
				hourlyDataFile.readline()
			hourlyData = hourlyDataFile.read()
			hourly.write(hourlyData)
			yearIndex += 1
		daily.close()
		hourly.close()
	validKeys.close()


if __name__ == '__main__':
	readCombos()