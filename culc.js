/*
memo
・実際にボウリング場での表示と同じように1投ごとに表示できるようにした。よって、JSONのDATEは無視してみました。
・IEはFileAPI非対応なのでだめ（だったような気がする）
・なんか気持ち悪いこーどになってしまった残念
・javascriptのclassだと処理、関数、プロパティの判断は命名規約に則らないとわけわからなくなるのを痛感
・node.jsでアプリとかどうやって書いてんだろ
・エラー処理どうしようかなー。。。（言い訳
・bracketでやってみたけど補完弱いし、classはバグでJSLintが非対応という悲しい現実　⇒　最新バージョンの１つ前落とせばいいらしい。
　でも前より書くのは相当楽になった気がする。拡張機能でどうにでもなるけどさがすのめんどくさかった。。
・メソッドのコメントめんどい（全部手書き）
*/
class Bowling {
    /**
     コンストラクタ
     @param pin_max:ピンの数
     @param frameCount:フレーム数
    */
    constructor(pin_max, frameCount) {
        "use strict";
        /**
         固定値  object.freezeだと参照するのが面倒なので。。手抜き
        */
        // ピンの数
        this.PIN_MAX = pin_max;
        // フレーム数
        this.FRAME_COUNT = frameCount;
        // 最終フレーム最大投球数
        this.THROW_LAST_MAX = 3;
        // 通常フレーム最大投球数
        this.THROW_MAX = 2;
        
        /**
         計算用
        */
        // 現在のフレーム
        this.currentFrame = 1;
        // 現在のフレーム内での投球数
        this.throwCountInFrame = 1;
        // 投球データリスト
        this.throws = new Array(0);
        // 得点（フレーム毎）　※初期化しようと思ったけどどうせ毎回初期化することになるのでNULL。
        this.frameScore = null;
    }
    
    /**
      投球
      @param pin:倒したピン
      @param isFoul:ファウルだったらTrue
      @param isSplit:スプリットだったらTrue
    */
    bowlThrow (pin, isFoul, isSplit) {
        // インスタンスを作成してとりあえず配列に突っ込む。
        var data = new ThrowData(this.currentFrame, this.throwCountInFrame, pin, isFoul, isSplit);
        this.throws.push(data);
        // フレーム終了判定
        if (this.isFrameExit(data)) {
            // 次のフレームに進む
            this.currentFrame++;
            // フレーム内投球数初期化
            this.throwCountInFrame = 1;
        } else {
            // フレーム内投球数インクリメント
            this.throwCountInFrame++;
        }
    }
    
    /**
     フレーム終了判定
     @param throwData
     @return Boolean (Trueでフレーム終了)
    */
    isFrameExit(throwData) {
        "use strict";
        // 最終フレーム以外は2投またはストライクで終了
        if (this.FRAME_COUNT != throwData.frame) {
            return throwData.throwCount === this.THROW_MAX || this.isStrike(throwData);
        } 
        // 最終フレームは3投で終了
        if (throwData.throwCount === this.THROW_LAST_MAX) {
            return true;
        } 
        // 最終フレームは2球で、スペアもストライクもとっていなければ終了
        return throwData.throwCount === this.THROW_MAX && !this.isSpair(throwData) && 
               !this.isStrike(this.throws[this.throws.indexOf(throwData) - 1]);
    }
    
    /**
     スコア計算
     @memo frameScore配列に得点を設定。実際のスコア表示に対応できるようにしてみたけど試してない。
    */
    culcScore() {
        "use strict";
        // スコア初期化
        this.frameScore = Array.apply(null, Array(this.FRAME_COUNT)).map(function () {return ""});
        // 最終フレームのスコア
        var lastFrameScore = 0;
        // 前のフレームのスコア
        var prevScore = 0;
        // 計算できるところまで計算する
        for (var i = 0; i < this.throws.length; i++) {
            
            var throwData = this.throws[i];
            
            if (throwData.frame === 1) {
                prevScore = 0;
            } else {
                prevScore = this.frameScore[throwData.frame - this.THROW_MAX]
            }
            
            if (this.FRAME_COUNT === throwData.frame) {
                // 最終フレームは単純加算
                lastFrameScore += throwData.getScore();
            } else if (this.isStrike(throwData)) {
                // ストライクの場合
                if (i + 2 < this.throws.length) {
                    this.frameScore[throwData.frame - 1] = prevScore + throwData.getScore() 
                                                         + this.throws[i + 1].getScore() 
                                                         + this.throws[i + 2].getScore();
                } else {
                    break;  
                }
            } else if (this.isSpair(throwData)) {
                // スペアの場合
                if (i + 1 < this.throws.length) {
                    this.frameScore[throwData.frame - 1] = prevScore + this.PIN_MAX + this.throws[i + 1].getScore();
                } else {
                    break;
                }
            } else {
                // ストライク、スペア以外の場合
                if (this.isFrameExit(throwData)) {
                    this.frameScore[throwData.frame - 1] = prevScore + throwData.getScore() + this.throws[i - 1].getScore();
                }
            }
        }
        
        // 最終フレームはめんどくさかったので全部足して最後に。※途中のデータは表示したくないのでやむをえず
        var lastThrowData = this.throws[this.throws.length - 1];
        if (lastThrowData.frame === this.FRAME_COUNT && this.isFrameExit(lastThrowData)) {
            this.frameScore[this.FRAME_COUNT - 1] = prevScore + lastFrameScore;
        }
    }
    
    /**
     スコア(frameScore配列)をHTMLの単純テーブル形式にする。
     @return HTML
     @memo 無理やりやってるのでまとまらないコードになってる。出力はデータだけ渡して呼び出し側にやらせる方が汎用的。。
    */
    getScoreHtml() {
        "use strict";
        var header = "";
        var body = "";
        var footer = "";
        
        // ヘッダー、フッター
        for (var i = 0; i < this.FRAME_COUNT; i++) {
            var colspan = (i + 1 < this.FRAME_COUNT) ? this.THROW_MAX : this.THROW_LAST_MAX;
            header += "<td colspan='" + colspan + "'>" + (i + 1) + "</td>";
            footer += "<td colspan='" + colspan + "'>" + this.frameScore[i].toString() + "</td>";
        }
        
        // 今の投球の前のフレーム
        var prevFrame = 1;
        // 投球データの出力
        for (var i = 0; i < this.throws.length; i++) {
            var data = this.throws[i];
            body += "<td>" + this.getDisplayScore(data) + "</td>";
            if (this.isFrameExit(data)) {
                prevFrame++;
                if (data.frame === this.FRAME_COUNT) {
                    for (var j = data.throwCount; j < this.THROW_LAST_MAX; j++) {
                        body += "<td></td>";
                    }
                } else if (data.throwCount === 1) {
                    body += "<td></td>";
                }
            }
        }
        
        // 途中の場合！
        // 1ゲームの投球数 フレーム数 × 2 + 1（最終フレームだけ３投なので + 1）
        var throwCount = this.FRAME_COUNT * this.THROW_MAX + 1;
        // 残り最大投球数を算出
        var lastThrowCount;
        if (this.throws.length === 0) {
            lastThrowCount = throwCount;
        } else {
            var throwData = this.throws[this.throws.length - 1];
            // (現在のフレーム - 1) * 2 + フレーム内の投球数が消化した投球数
            lastThrowCount = throwCount - ((throwData.frame - 1) * this.THROW_MAX + throwData.throwCount);
        }
        
        for (var i = 0; i < lastThrowCount; i++) {
            body += "<td></td>";
        }
        
        return "<table><tr>" + header + "</tr><tr>" + body + "</tr><tr>" + footer + "</tr></table>";
    }
    
    /**
      出力用のスコアを返します。めんどくさいのでストライク、スペアは文字でST、SP。
      @param throwData:ThrowDataクラス
      @return HTML
    */
    getDisplayScore(throwData) {
        "use strict";
        if (throwData.isFoul) {
            return "F";
        } else if (throwData.isSplit) {
            return "&#" + (9311 + throwData.pin) + ";";
        } else if (this.isStrike(throwData)) {
            return "ST";
        } else if (this.isSpair(throwData)) {
            return "SP"
        } else if (throwData.pin === 0) {
            // 1投目は絶対G
            if (throwData.throwCount === 1) {
                return "G";
            } else if (throwData.frame === this.FRAME_COUNT) {
                // 1投目以外で最終フレームの場合はG,-どっちか。前の投球がストライクかスペアだったらG
                var preThrowData = this.throws[this.throws.indexOf[throwData] - 1];
                if (this.isStrike(preThrowData) || this.isSpair(preThrowData)) {
                    return "G";
                } else {
                    return "-";
                }
                
            } else {
                // 最終フレームで1投目以外は-
                return "-";
            }
        } else {
            return throwData.pin.toString();
        }
    }
    
    /**
     ストライク判定
     @param throwData:ThrowDataクラス
     @return Boolean（Trueでストライク）
    */
    isStrike(throwData) {
        "use strict";
        // 全部倒してなければストライクではない。
        if(throwData.isFoul || throwData.isSplit || throwData.pin < this.PIN_MAX) {
            return false;
        }
        // 1投目で全部倒しているのは常にストライク
        if (throwData.throwCount === 1) {
            return true;
        }
        // 最終フレームは前の投球がストライクかスペアだったらOK
        if (throwData.frame === this.FRAME_COUNT) {  
            var preThrowData = this.throws[this.throws.indexOf(throwData) - 1];
            return this.isStrike(preThrowData) || this.isSpair(preThrowData);
        } 
        return false;
    }
    
    /**
     スペア判定
     @param throwData:ThrowDataクラス
     @return Boolean（Trueでスペア）
    */
    isSpair(throwData) {
        "use strict";
        // 1投目はありえない
        if (throwData.throwCount === 1) {
            return false;
        }
        // ファウル、スプリット、ミスの場合はありえない
        if (throwData.isFoul || throwData.isSplit || throwData.pin === 0) {
            return false;
        }
        // 前の投球データを取得
        var preThrowData = this.throws[this.throws.indexOf(throwData) - 1];
        // 最終フレーム以外は２投の合計点がpin_maxと一致すればOK
        if (throwData.frame != this.FRAME_COUNT) {
            return preThrowData.getScore() + throwData.getScore() === this.PIN_MAX;
        }
        // 最終フレームは前の投球がストライク以外で合計がpin_maxになればOK
        return !this.isStrike(preThrowData) && preThrowData.getScore() + throwData.getScore() === this.PIN_MAX;
    }
    
}

/**
  投球データクラス
*/
class ThrowData {
    /**
     コンストラクタ
     @param frame: integer フレーム
     @param throwCount: integer 何投目か
     @param pin: integer 倒したピンの数
     @param isFoul: boolean ファウルだったらTrue
     @param isSplit: boolean スプリットだったらTrue
    */
    constructor (frame, throwCount, pin, isFoul, isSplit) {
        this.frame = frame;
        this.throwCount = throwCount;
        this.pin = pin;
        this.isFoul = isFoul;
        this.isSplit = isSplit;
    }
    
    /**
     計算用のスコアを返します。
     @return integer スコア
    */
    getScore() {
        "use strict";
        if (this.isFoul) {
            return 0;
        } else {
            return this.pin;
        }
    }
}