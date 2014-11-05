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

np.seterr(divide='ignore', invalid='ignore')
cityListFile = 'agg_timezone.csv'
folderName = 'updatedData-2014-10-24'
#folderName = 'testInput'
outputFolder = "outputCompare_2014-10-24"
tzDict = {}
allCities = []
dataByCities = {}
cityCodes = {};
aggData = {}
ispsByCode = {}
allFilenames = []
allIsps = []
metrics = ["packet_retransmit_rate", "minimum_rtt", "average_rtt", "download_throughput","upload_throughput"]

def timeZoneInfo():
	reader = csv.reader(open('agg_timezone.csv','rU'))
	next(reader, None)
	for row in reader:
		tzDict[row[0].lower()] = row[4]
	getCodes()
def getCodes():
	reader = csv.reader(open(cityListFile,' rU'))
	cityHeaders = next(reader,None)
	print(cityHeaders)
	print('data')
	for row in reader:
		location = row[2]+'-'+ row[1]
		location = row[0][:3]
		if location not in allCities:
			allCities.append(location)
			dataByCities[location] = []
			cityCodes[location] = []
		cityCodes[location].append(row[0].lower())
		print(row)
	#print(tzDict)
	# done timeZone info loading, run directory
	print(allCities)
	print(dataByCities)
	print(cityCodes)
	getISPsByCode()
def getISPsByCode():
	for filename in os.listdir('./' + folderName):
		if filename[0] is '.':
			continue

		allFilenames.append(filename)
		print filename
		year = filename[:4]
		dayNum = filename[18:21]
		code = filename[23:28]
		isps = filename[29:-15]
		if code not in ispsByCode:
			ispsByCode[code] = []
		if isps not in allIsps:
			allIsps.append(isps)
		ispsByCode[code].append(isps)
	print ispsByCode
	print allIsps
	print(allFilenames)
	aggCities()

def aggCities():
	print('agg cities')
	#runDirectory()
	for location, codes in cityCodes.iteritems():
		print location
		byMonthAndDay = {}
		byMonthAndHour = {}
		#should be outputting a data file for every city/isp combo
		for isp in allIsps:
			byMonthAndHour = {}
			byMonthAndDay = {}
			for code in codes:
				runDirectory(code, isp, byMonthAndDay, byMonthAndHour)
			output(location, isp, byMonthAndHour, byMonthAndDay)			
		"""
		for isp in isplist
			byMonthAndHour = {}
			byMonthAndDay = {}
			for code in location
				runDirectory(code, isp, byMonthAndDay, byMonthAndHour)
			output(location, isp, byMonthAndHour, byMonthAndDay)
		for code in codes:
			if code in ispsByCode:
				for isp in ispsByCode[code]:
					runDirectory(code, isp,byMonthAndDay, byMonthAndHour)

		output(location, byMonthAndHour, byMonthAndDay)
		"""


def runDirectory(codeToAgg,ispToAgg, byMonthAndDay, byMonthAndHour):
	print "run dir " + codeToAgg + " " + ispToAgg
	ispsArr = []
	for (dirpath, dirnames, filenames) in os.walk('./' + folderName):
		for filename in filenames:
			if filename[0] is '.':
				continue
			year = filename[:4]
			dayNum = filename[18:21]
			code = filename[23:28]
			isps = filename[29:-15]
			if(isps == ispToAgg and code == codeToAgg):
				datafileAggregation = aggregate(year, dayNum, code, isps, byMonthAndDay, byMonthAndHour)
				#print(datafileAggregation)
				
def aggregate(year, dayNum, code, isps, byMonthAndDay, byMonthAndHour):
	print "year-" + year + "-dayNum-" + dayNum + "-code-" + code + "-isps-" + isps  
	queryStr = year + "-01-01-000000+" + dayNum + "d_" + code + "_" + isps
	#csvFile.writerow(["id", "date", "hour", "packet_retransmit_rate_median", "packet_retransmit_rate_mean", "packet_SN", "minimum_rtt_median", "minimum_rtt_mean", "min_SN", "average_rtt_median", "average_rtt_mean", "avg_SN", "download_throughput_median", "download_throughput_mean", "download_SN","upload_throughput_median", "upload_throughput_mean", "upload_SN"])
	reader = csv.reader(open( folderName + "/" + queryStr + '_merged-raw.csv', "rU"))

	rowNum = int(dayNum) * 24
	metricsNum = len(metrics)
	matrix = [[[] for i in xrange(metricsNum)] for j in xrange(rowNum)] # dayNum x 5 x []
	
	localTimezone = timezone(tzDict[code])

	for row in reader:
		correctTzHour = localTimezone.localize(datetime.datetime.utcfromtimestamp(int(row[0]))) # to get the correct local time considering daylight saving
		correctTzHour = int(correctTzHour.strftime('%z')) / 100 
		localTime = datetime.datetime.utcfromtimestamp(int(row[0])) + timedelta(hours=correctTzHour)

		if(int(localTime.strftime('%Y')) == int(year)): # some dates fall out of the year range cuz of timezone
			month = (localTime.strftime('%m-%Y'))
			if month not in byMonthAndDay:
				byMonthAndDay[month] = {}
				byMonthAndHour[month] = {}

			#date = int(localTime.strftime('%j')) - 1 # nth day in the year
			dayOfMonth = int(localTime.strftime('%d'))
			hour = int(localTime.strftime('%H'))
			
			dataValue = float(row[1].replace(",", ""))
			dataKey = row[2]
			

			if dayOfMonth not in byMonthAndDay[month]:
				byMonthAndDay[month][dayOfMonth] = {}
			if dataKey not in byMonthAndDay[month][dayOfMonth]:
				byMonthAndDay[month][dayOfMonth][dataKey] = []
			byMonthAndDay[month][dayOfMonth][dataKey].append(dataValue)
			if hour not in byMonthAndHour[month]:
				byMonthAndHour[month][hour] = {}
			if dataKey not in byMonthAndHour[month][hour]:
				byMonthAndHour[month][hour][dataKey] = []
			byMonthAndHour[month][hour][dataKey].append(dataValue)

	return {"daily": byMonthAndDay, "hour": byMonthAndHour}

	#print("by hour")			
	#print(byMonthAndHour)
	#print("by day")
	#print(byMonthAndDay)
def output(location, isp, byMonthAndHour, byMonthAndDay):
	print('writing ' + location + " " + isp)
	formatter = '%.4g'

	hourlyCSV = csv.writer(open( outputFolder + "/" + location + '_' + isp.replace('&','') + "_hourly.csv", "wb+"))
	headers = ['month', 'hour', 'year']
	for metric in metrics:
		headers.append(metric)
		headers.append(metric+'_n')
	hourlyCSV.writerow(headers)
	for monthYear, monthlyData in byMonthAndHour.iteritems():
		parts = monthYear.split('-')
		month = int(parts[0])
		year = int(parts[1])

		for hour, hourlyData in monthlyData.iteritems():
			row = [month, hour, year]
			for metric in metrics:
				if metric in hourlyData:
					median = formatter % np.median(hourlyData[metric])
					row.append(median)
					row.append(len(hourlyData[metric]))
				else:
					row.append('nan')
					row.append(0)
			hourlyCSV.writerow(row)

	dailyCSV = csv.writer(open(outputFolder + '/' + location + '_' + isp.replace('&','') + '_daily.csv', 'wb+'))
	headers = ['month','day','year']
	for metric in metrics:
		headers.append(metric)
		headers.append(metric+'_n')
	dailyCSV.writerow(headers)
	for monthYear, monthlyData in byMonthAndDay.iteritems():
		parts = monthYear.split('-')
		month = int(parts[0])
		year = int(parts[1])
		for day, dailyData in monthlyData.iteritems():
			row = [month, day, year]
			for metric in metrics:
				if metric in dailyData:
					median = formatter % np.median(dailyData[metric])
					row.append(median)
					row.append(len(dailyData[metric]))
				else:
					row.append('nan')
					row.append(0)
			dailyCSV.writerow(row)

	

if __name__ == '__main__':
	timeZoneInfo()
	# runDirectory()
