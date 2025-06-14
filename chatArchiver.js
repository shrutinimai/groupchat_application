// services/chatArchiver.js
const { Op } = require('sequelize'); // Import Sequelize's Op for query operations
const db = require('../models'); // Import your centralized models (models/index.js)

/**
 * @typedef {import('sequelize').Op} Op
 * @typedef {import('../models/groupmessageData')} GroupMessageModel
 * @typedef {import('../models/messageData')} MessageModel
 * @typedef {import('../models/archivedGroupMessage')} ArchivedGroupMessageModel
 * @typedef {import('../models/archivedMessage')} ArchivedMessageModel
 */

// Access your database models from the centralized 'db' object
const GroupMessage = db.GroupMessage;
const ArchivedGroupMessage = db.ArchivedGroupMessage;
const Message = db.Message;
const ArchivedMessage = db.ArchivedMessage;



async function archiveChatMessages() {
    console.log('--- Starting chat archiving process ---');

    const oneDayAgo = new Date(Date.now() - (24 * 60 * 60 * 1000)); 
    console.log(`Archiving messages older than: ${oneDayAgo.toISOString()}`);

    try {
        console.log('Archiving old group messages...');
        const oldGroupMessages = await GroupMessage.findAll({
            where: {
                created_at: { 
                    [Op.lt]: oneDayAgo 
                }
            },
            raw: true 
        });

        if (oldGroupMessages.length > 0) {
            const groupMessagesToArchive = oldGroupMessages.map(msg => ({
                id: msg.id,
                group_id: msg.group_id,
                user_id: msg.user_id,
                message: msg.message,
                fileUrl: msg.fileUrl,
                fileType: msg.fileType,
                created_at: msg.created_at,
                archived_at: new Date()    
            }));


            await ArchivedGroupMessage.bulkCreate(groupMessagesToArchive, { ignoreDuplicates: true });
            console.log(`Successfully archived ${oldGroupMessages.length} group messages.`);

            const deletedGroupCount = await GroupMessage.destroy({
                where: {
                    created_at: {
                        [Op.lt]: oneDayAgo
                    }
                }
            });
            console.log(`Successfully deleted ${deletedGroupCount} old group messages from GroupMessage table.`);
        } else {
            console.log('No old group messages found to archive.');
        }

        console.log('Archiving old direct messages...');
        const oldDirectMessages = await Message.findAll({
            where: {
                createdAt: { 
                    [Op.lt]: oneDayAgo
                }
            },
            raw: true 
        });

        if (oldDirectMessages.length > 0) {
            const directMessagesToArchive = oldDirectMessages.map(msg => ({
                id: msg.id,
                userId: msg.userId,
                message: msg.message,
                createdAt: msg.createdAt, 
                archived_at: new Date()   
            }));

            await ArchivedMessage.bulkCreate(directMessagesToArchive, { ignoreDuplicates: true });
            console.log(`Successfully archived ${oldDirectMessages.length} direct messages.`);

            const deletedDirectCount = await Message.destroy({
                where: {
                    createdAt: {
                        [Op.lt]: oneDayAgo
                    }
                }
            });
            console.log(`Successfully deleted ${deletedDirectCount} old direct messages from Message table.`);
        } else {
            console.log('No old direct messages found to archive.');
        }

    } catch (error) {
        console.error('Error during chat archiving process:', error);
    } finally {
        console.log('--- Chat archiving process finished ---');
    }
}

module.exports = archiveChatMessages; 