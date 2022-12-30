// Copyright 2020 The Nakama Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

function rpcReward(context: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    if (!context.userId) {
        throw Error('No user ID in context');
    }

    if (payload){
        throw Error('no input allowed');
    }

    var objectId: nkruntime.StorageReadRequest = {
        collection: 'reward',
        key: 'daily',
        userId: context.userId,
    }
    var objects: nkruntime.StorageObject[];
    try {
        objects = nk.storageRead([ objectId ]);
    } catch (error) {
        logger.error('storageRead error: %s', error);
        throw error;
    }

    var dailyReward: any = {
        lastClaimUnix: 0,
    }
    objects.forEach(object => {
        if (object.key == 'daily') {
            dailyReward = object.value;
        }
    });

    var resp = {
        coinsReceived: 0,
    }

    var d = new Date();
    d.setHours(0,0,0,0);

    // If last claimed is before the new day grant a new reward!
    if (dailyReward.lastClaimUnix < msecToSec(d.getTime())) {
        resp.coinsReceived = 500;

        // Update player wallet.
        var changeset = {
            coins: resp.coinsReceived,
        }
        try {
            nk.walletUpdate(context.userId, changeset, {}, false);
        } catch (error) {
            logger.error('walletUpdate error: %q', error);
            throw error;
        }

        var notification: nkruntime.NotificationRequest = {
            code: 1001,
            content: changeset,
            persistent: true,
            subject: "You've received your daily reward!",
            userId: context.userId,
        }
        try {
            nk.notificationsSend([notification]);
        } catch (error) {
            logger.error('notificationsSend error: %q', error);
            throw error;
        }

        dailyReward.lastClaimUnix = msecToSec(Date.now());

        var write: nkruntime.StorageWriteRequest = {
            collection: 'reward',
            key: 'daily',
            permissionRead: 1,
            permissionWrite: 0,
            value: dailyReward,
            userId: context.userId,
        }
        if (objects.length > 0) {
            write.version = objects[0].version
        }

        try {
            nk.storageWrite([ write ])
        } catch (error) {
            logger.error('storageWrite error: %q', error);
            throw error;
        }
    }

    var result = JSON.stringify(resp);
    logger.debug('rpcReward resp: %q', result)

    return result;
}


class rewardData {
        rewardEntry: [{[key:string]:any;
            itemId:string;
            amount:number;}];
        latestUpdatedUnix: number;
  constructor() {
    this.rewardEntry = [{itemId:'0',amount:0}];
    this.latestUpdatedUnix = 0;
     }

}

function rpcMatchWon(context: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    // get relevant match reward info 
    var matchReward = getMatchReward(context, logger, nk, payload);
    //update player data, add reward to wallet
    logger.debug('reward#1: %q', matchReward);
   
    const rewardDataInstance = new rewardData;
    for(var i in matchReward){
    logger.debug('matchRewardContent',i);
        if(i === 'latestUpdatedUnix'){
            rewardDataInstance.latestUpdatedUnix = matchReward[i];
        }

        if(i === 'rewardEntry'){
            rewardDataInstance.rewardEntry = matchReward[i]; 
        }
    }

    logger.debug('setting RewardDataInstance  : ',rewardDataInstance.latestUpdatedUnix);
    for( var q in rewardDataInstance.rewardEntry)
        {
            logger.debug('setting RewardDataInstance rewardEntry : ',rewardDataInstance.rewardEntry[q]);
            let currentReward = rewardDataInstance.rewardEntry[q];
           var now = msecToSec(Date.now());
           
   var key  = ''; 
     var amount = 1; 
            for(var x in currentReward){
             
   logger.debug('Getting currentReward Key Value: ',currentReward[x]['itemId']); 
   logger.debug('Getting currentReward Value: ',currentReward[x]['amount']);
                key = currentReward[x]['itemId'];
                amount = currentReward[x]['amount'];
    var itemEntryData: any = {
            itemId: key,
            amount: amount,
            addedOn: now,
            }

            var addItemOp: nkruntime.StorageWriteRequest = {
            collection: 'inventory',
            key: key,
            permissionRead: 1,
            permissionWrite: 0,
            value: itemEntryData,
            userId: context.userId,
        }
        try {
            nk.storageWrite([ addItemOp])
        } 
    catch (error) {
            logger.error('storageWrite error: %q', error);
            throw error;
        }


                }
         
        
        }

    




    var result = JSON.stringify(matchReward);
    //response with changes
    logger.debug('rpcMatchWon response: %q', result);

    return result;
}


function getMatchReward(context: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): any{
 if (!context.userId) {
        throw Error('No user ID in context');
    }

    var objectId: nkruntime.StorageReadRequest = {
        collection: 'matchReward',
        key: payload,
        userId: context.userId,
    }

    var objects: nkruntime.StorageObject[];
    try {
        objects = nk.storageRead([ objectId ]);
    } catch (error) {
        logger.error('storageRead error: %s', error);
        throw error;
    }

    var matchReward: any = {
        latestUpdatedUnix: 0,
    }

    objects.forEach(function (object) {
        if (object.key == payload) {
            matchReward = object.value;
        }
    });

    return matchReward;
}



function rpcInitializeUser(context: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) : any {
    if (!context.userId) {
        throw Error('No user ID in context');
    }

    var initialzedTime = msecToSec(Date.now());
    var itemData00: any = {
    quantity: 1,
    goldCost: 100,
    gemCost: 10,
    latestUpdatedUnix: initialzedTime,
    }
    var writeItem00Op: nkruntime.StorageWriteRequest = {
            collection: 'catalogue',
            key: 'item_00',
            permissionRead: 1,
            permissionWrite: 0,
            value: itemData00,
            userId: context.userId,
        }
    var itemData01: any = {
    quantity: 1,
    goldCost: 200,
    gemCost: 20,
    latestUpdatedUnix: initialzedTime,
    }
    var writeItem01Op: nkruntime.StorageWriteRequest = {
            collection: 'catalogue',
            key: 'item_01',
            permissionRead: 1,
            permissionWrite: 0,
            value: itemData01,
            userId: context.userId,
        }
    var itemData02: any = {
    quantity: 1,
    goldCost: 300,
    gemCost: 30,
    latestUpdatedUnix: initialzedTime,
    }
    var writeItem02Op: nkruntime.StorageWriteRequest = {
            collection: 'catalogue',
            key: 'item_02',
            permissionRead: 1,
            permissionWrite: 0,
            value: itemData02,
            userId: context.userId,
        }
    var itemData03: any = {
    quantity: 1,
    goldCost: 400   ,
    gemCost: 40,
    latestUpdatedUnix: initialzedTime,
    }
    var writeItem03Op: nkruntime.StorageWriteRequest = {
            collection: 'catalogue',
            key: 'item_03',
            permissionRead: 1,
            permissionWrite: 0,
            value: itemData03,
            userId: context.userId,
        }
        
    var matchRewardData00: any = {
    rewardEntry: [[{itemId:'item_00',amount: 1}],[{itemId:'item_01', amount:5}]],
        latestUpdatedUnix: initialzedTime
    }

    var writeMatchReward00Op: nkruntime.StorageWriteRequest = {
            collection: 'matchReward',
            key: 'level0-0',
            permissionRead: 1,
            permissionWrite: 0,
            value: matchRewardData00,
            userId: context.userId,
        }



    try {
            nk.storageWrite([ writeItem00Op, writeItem01Op
                , writeItem02Op, writeItem03Op, writeMatchReward00Op ])
        } 
    catch (error) {
            logger.error('storageWrite error: %q', error);
            throw error;
        }
}





function rpcCanClaimDailyReward(context: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    var dailyReward = getLastDailyRewardObject(context, logger, nk, payload);
    var response = {
        canClaimDailyReward: canUserClaimDailyReward(dailyReward)
    }

    var result = JSON.stringify(response);
    logger.debug('rpcCanClaimDailyReward response: %q', result);

    return result;
}


function getLastDailyRewardObject(context: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) : any {
    if (!context.userId) {
        throw Error('No user ID in context');
    }

    if (payload) {
        throw Error('No input allowed');
    }

    var objectId: nkruntime.StorageReadRequest = {
        collection: 'reward',
        key: 'daily',
        userId: context.userId,
    }

    var objects: nkruntime.StorageObject[];
    try {
        objects = nk.storageRead([ objectId ]);
    } catch (error) {
        logger.error('storageRead error: %s', error);
        throw error;
    }

    var dailyReward: any = {
        lastClaimUnix: 0,
    }

    objects.forEach(function (object) {
        if (object.key == 'daily') {
            dailyReward = object.value;
        }
    });

    return dailyReward;
}


function canUserClaimDailyReward(dailyReward: any) {
    if (!dailyReward.lastClaimUnix) {
        dailyReward.lastClaimUnix = 0;
    }

    var d = new Date();
    d.setHours(0, 0, 0, 0);

    return dailyReward.lastClaimUnix < msecToSec(d.getTime());
}


function msecToSec(n: number): number {
    return Math.floor(n / 1000);
}
