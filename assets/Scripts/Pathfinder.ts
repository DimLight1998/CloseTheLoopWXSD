const { ccclass, property } = cc._decorator;

@ccclass
export default class Pathfinder extends cc.Component {
    @property(cc.Node)
    display: cc.Node = null;

    start(): void {
        this.display.opacity = 0;
        wx.onMessage(data => {
            let command: string = data.command;
            switch (command) {
                case 'DisplayFriendsScore': {
                    this.refreshFriendScore();
                    this.display.opacity = 255;
                    break;
                }
                case 'HideFriendsScore': {
                    this.display.opacity = 0;
                    break;
                }
                case 'UpdatePlayerScore': {
                    let score: number = data.param1;
                    let nKill: number = data.param2;
                    wx.getUserCloudStorage({
                        keyList: ['score'],
                        success: res => {
                            let obj: any = null;
                            if (res.KVDataList.length > 0) {
                                obj = JSON.parse(res.KVDataList[0].value);
                            }
                            if (res.KVDataList.length === 0 || // this user had no data before
                                score > obj.percentage || // this user broke his record
                                (score === obj.percentage && nKill < obj.nKill) // this user didn't break his record
                            ) {
                                wx.setUserCloudStorage({
                                    KVDataList: [
                                        {
                                            key: 'score',
                                            value: JSON.stringify(
                                                { percentage: score, nKill: nKill, timestamp: Date.now() }
                                            )
                                        }
                                    ]
                                });
                            }
                        },
                        fail: () => {
                            console.log('fail');
                        }
                    });
                    break;
                }
            }
        });
    }

    refreshFriendScore(): void {
        wx.getFriendCloudStorage({
            keyList: ['score'],
            success: res => {
                console.log(res);
            }
        });
    }
}