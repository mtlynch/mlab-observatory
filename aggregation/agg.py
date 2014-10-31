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
folderName = 'updatedData-2014-10-24'
#folderName = 'testInput'
outputFolder = "newOut2014-10-24"
tzDict = {}
def timeZoneInfo():
	reader = csv.reader(open('agg_timezone.csv','rU'))
	next(reader, None)
	for row in reader:
		tzDict[row[0].lower()] = row[4]
	#print(tzDict)
	# done timeZone info loading, run directory
	runDirectory()

def runDirectory():
	csvFile = csv.writer(open( "validCombs.csv", "wb+"))
	csvFile.writerow(["year", "dayNum", "code", "isps"])
	ispsArr = []
	for (dirpath, dirnames, filenames) in os.walk('./' + folderName):
		for filename in filenames:
			print filename
			year = filename[:4]
			dayNum = filename[18:21]
			code = filename[23:28]
			isps = filename[29:-15]
			if(isps not in ispsArr):
				ispsArr.append(isps)
			csvFile.writerow([year, dayNum,code.replace("&", ""), isps])	
			aggregate(year, dayNum, code, isps)

	# print ispsArr
				
def aggregate(year, dayNum, code, isps):
	print "year-" + year + "-dayNum-" + dayNum + "-code-" + code + "-isps-" + isps  
	queryStr = year + "-01-01-000000+" + dayNum + "d_" + code + "_" + isps
	#csvFile.writerow(["id", "date", "hour", "packet_retransmit_rate_median", "packet_retransmit_rate_mean", "packet_SN", "minimum_rtt_median", "minimum_rtt_mean", "min_SN", "average_rtt_median", "average_rtt_mean", "avg_SN", "download_throughput_median", "download_throughput_mean", "download_SN","upload_throughput_median", "upload_throughput_mean", "upload_SN"])
	reader = csv.reader(open( folderName + "/" + queryStr + '_merged-raw.csv', "rU"))

	rowNum = int(dayNum) * 24
	metrics = ["packet_retransmit_rate", "minimum_rtt", "average_rtt", "download_throughput","upload_throughput"]
	metricsNum = len(metrics)
	matrix = [[[] for i in xrange(metricsNum)] for j in xrange(rowNum)] # dayNum x 5 x []
	byMonthAndDay = {}
	byMonthAndHour = {}
	localTimezone = timezone(tzDict[code])

	for row in reader:
		correctTzHour = localTimezone.localize(datetime.datetime.utcfromtimestamp(int(row[0]))) # to get the correct local time considering daylight saving
		correctTzHour = int(correctTzHour.strftime('%z')) / 100 
		localTime = datetime.datetime.utcfromtimestamp(int(row[0])) + timedelta(hours=correctTzHour)

		if(int(localTime.strftime('%Y')) == int(year)): # some dates fall out of the year range cuz of timezone
			month = int(localTime.strftime('%m'))
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


	#print("by hour")			
	#print(byMonthAndHour)
	#print("by day")
	#print(byMonthAndDay)

	formatter = '%.4g'

	hourlyCSV = csv.writer(open( outputFolder + "/" + queryStr.replace("&","") + "_hourly.csv", "wb+"))
	headers = ['month', 'hour', 'year']
	for metric in metrics:
		headers.append(metric)
		headers.append(metric+'_n')
	hourlyCSV.writerow(headers)
	for month, monthlyData in byMonthAndHour.iteritems():
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

	dailyCSV = csv.writer(open(outputFolder + '/' + queryStr.replace("&","") + '_daily.csv', 'wb+'))
	headers = ['month','day','year']
	for metric in metrics:
		headers.append(metric)
		headers.append(metric+'_n')
	dailyCSV.writerow(headers)
	for month, monthlyData in byMonthAndDay.iteritems():
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
	#pprint.pprint(matrix)

	dayscounter = 0
	rowid = 0
	startdate = datetime.date(int(year), 01, 01)
	tmp = [[] for i in xrange(metricsNum)]

	#compute median for each day
	#compute median for each hour within a month

	"""
	for i in xrange(rowNum):
		csvFile.writerow([rowid, 
			str(startdate + datetime.timedelta(days=dayscounter)), 
			i%24, 
			formatter % np.median(matrix[i][0]), 
			#formatter % np.mean(matrix[i][0]), 
			len(matrix[i][0]), 
			formatter % np.median(matrix[i][1]), 
			#formatter % np.mean(matrix[i][1]), 
			len(matrix[i][1]), 
			formatter % np.median(matrix[i][2]), 
			#formatter % np.mean(matrix[i][2]), 
			len(matrix[i][2]), 
			formatter % np.median(matrix[i][3]), 
			#formatter % np.mean(matrix[i][3]), 
			len(matrix[i][3]), 
			formatter % np.median(matrix[i][4]), 
			#formatter % np.mean(matrix[i][4]), 
			len(matrix[i][4])
		])
		for k in xrange(metricsNum):
			tmp[k] += matrix[i][k]
		if(i%24 == 23):
			csvFile.writerow([rowid, str(startdate + datetime.timedelta(days=dayscounter)), -99, 
				formatter % np.median(tmp[0]), 
				#formatter % np.mean(tmp[0]),
				len(tmp[0]), 
				formatter % np.median(tmp[1]), 
				#formatter % np.mean(tmp[1]), 
				len(tmp[1]), 
				formatter % np.median(tmp[2]), 
				#formatter % np.mean(tmp[2]), 
				len(tmp[2]), 
				formatter % np.median(tmp[3]), 
				#formatter % np.mean(tmp[3]), 
				len(tmp[3]), 
				formatter % np.median(tmp[4]), 
				#formatter % np.mean(tmp[4]), 
				len(tmp[4]) 
			])
			for t in xrange(metricsNum):
				tmp[t] = []
			rowid += 1
			dayscounter += 1
		rowid += 1
	"""

if __name__ == '__main__':
	timeZoneInfo()
	# runDirectory()
