const cron = require("node-cron");
const MessageGroup = require('../models/messageGroup');
const Sender = require('../models/sender');


exports.setPublishReportCron = (cron_str, reportPeriodFunc) =>{
    cron.schedule(cron_str, () => this.publishReports(reportPeriodFunc));
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

    return doc[0].messages_count
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

    return doc[0].messages_count
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


exports.genReport = async (reportPeriodFunc) => {
    let [periodStart, periodEnd] = reportPeriodFunc();
    let usersReplyCount = await this.getUsersReplyCount(periodStart, periodEnd );
    let totalUsersReplyCount = await this.getAllUserReplyCount();
    let uniqueMessageCount = await this.getMessagesCount(periodStart, periodEnd );
    let unrepliedCount =  await this.getUnrepliedCount(periodStart, periodEnd );
    let totalUniqueMessageCount = await this.getTotalUniqueMessagesnCount();
    let totalMessagesnCount = await this.getTotalMessagesCount();

    console.log(await MessageGroup.find({}));
    console.log(usersReplyCount, totalUsersReplyCount, uniqueMessageCount, unrepliedCount, totalUniqueMessageCount, totalMessagesnCount)
}

exports.publishReports = (reportPeriodFunc) =>{

}