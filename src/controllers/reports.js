const cron = require("node-cron");
const MessageGroup = require('../models/messageGroup');
const Sender = require('../models/sender');

const msgsTexts = require('../msgsTexts.json');

let client, reportCron;

exports.setClient = (wppClient) => {
  client = wppClient
}

exports.setPublishReportCron = (cron_str, reportPeriodFunc) =>{
    reportCron = cron.schedule(cron_str, () => {
      this.publishReports(reportPeriodFunc)
    });
}

exports.cancelPublishReportCron = () =>{
  reportCron.stop()
}

exports.getUsersReplyCount = (periodStart, periodEnd) => {
    return MessageGroup.aggregate([
        {
          $match: {
            "replyDate": {
              $gte: periodStart,
              $lt: periodEnd
            }
          }
        },
        {
          $group: {
            _id: "$replyDiscourseAuthor",
            count: {
              $sum: 1
            }
          }
        },
        { $sort: {count:-1} }
      ])
}


exports.getAllUserReplyCount = () => {
    return Sender.aggregate([
        {
          $group: {
            _id: "$discourseUserName",
            count: {
              $sum: "$acceptedRepliesCount"
            }
          }
        },
        { $sort: {count:-1} }
      ])
}

exports.getMessagesCount = async (periodStart, periodEnd) => {

    doc = await MessageGroup.aggregate([
        {
          $match: {
            "createdAt": {
              $gte: periodStart,
              $lt: periodEnd
            }
          }
        },
        {
            $count: "messages_count"
        }
      ])

    return (doc[0]||{messages_count:0}).messages_count
}

exports.getUnrepliedCount = async() => {

    doc = await MessageGroup.aggregate([
        {
          $match: {
            replyDate: {
                $exists: false
            } 
          }
        },
        {
            $count: "messages_count"
        }
      ])

    return (doc[0]||{messages_count:0}).messages_count
}

exports.getTotalUniqueMessagesnCount = () => {
    return MessageGroup.estimatedDocumentCount()
}

exports.getTotalMessagesCount = async () => {
    docs = await MessageGroup.aggregate([
        { "$project": {
              "countUsers": { "$size": "$reportUsers" },
              "countGroups": { "$size": "$reportGroups" }
        } },
        { "$group": {
            "_id": null,
            "totalCountUsers": {
                "$sum": "$countUsers"
            },
            "totalCountGroups": {
                "$sum": "$countGroups"
            }
        } }
    ])
    return docs[0]
}

exports.genRank = (data, userName = '', n = 5) =>{
  let body = []
  let line
  data.forEach( (el, idx) =>{
    line = `${idx+1} -> ${el._id} (${el.count} mensagens)`
    line = el._id == userName ? '*' + line + '* 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉': line
    if ((el._id !== null) && ( idx<n || el._id == userName)){
      body.push(line)
    }
  })
  return body.join('\n')
}

exports.genUserReport = (
  userName,
  usersReplyCount, totalUsersReplyCount, uniqueMessageCount, unrepliedCount, totalUniqueMessageCount, totalMessagesnCount
) => {

  let rank1 = this.genRank(usersReplyCount, userName)
  let rank2 = this.genRank(totalUsersReplyCount, userName)
  return msgsTexts.curators.report.join('\n').format(
      userName,
      (usersReplyCount.find(el => el._id == userName) || {count:0}).count,
      (totalUsersReplyCount.find(el => el._id == userName) || {count:0}).count,
      uniqueMessageCount,
      totalUniqueMessageCount,
      totalMessagesnCount['totalCountUsers'],
      totalMessagesnCount['totalCountGroups'],
      unrepliedCount,
      rank1,
      rank2
    );
}

exports.publishReports = async (reportPeriodFunc) =>{
    let [periodStart, periodEnd] = reportPeriodFunc();
    let usersReplyCount = await this.getUsersReplyCount(periodStart, periodEnd );
    let totalUsersReplyCount = await this.getAllUserReplyCount();
    let uniqueMessageCount = await this.getMessagesCount(periodStart, periodEnd );
    let unrepliedCount =  await this.getUnrepliedCount();
    let totalUniqueMessageCount = await this.getTotalUniqueMessagesnCount();
    let totalMessagesnCount = await this.getTotalMessagesCount();

    totalUsersReplyCount.forEach( async (obj) =>{
      if (obj._id !== null){
        let senderObj = await Sender.findOne({discourseUserName:obj._id})
        if (!senderObj.senderId.includes('DISC_')){
          let message = this.genUserReport(obj._id, usersReplyCount, totalUsersReplyCount, uniqueMessageCount, unrepliedCount, totalUniqueMessageCount, totalMessagesnCount)
          await client.sendText( senderObj.senderId, message)
        }
      }
    });
}