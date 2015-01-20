# semedie

a [Sails](http://sailsjs.org) application

## モデルの関係

### Channel

* 複数のEpisodeを持つ
* FEEDURLでユニーク

#### アクション

* Subscribe
* Update
* Clear
* Delete

### Episode

* 親として単一のChannelを持つ
* ChannelIdとLINKの関連でユニーク
* 単一のMediaを持つ

#### アクション

* Create
* Update
* Read
* Unread
* Delete

### Media

* 検討中

#### アクション

* Create
* Update
*
* Play


## 流れ

* URLをもらう
* FeedかCustomFeedか知らないかを確認する
* 知らなかったら？ContentsTypeを確認する？
* Channel情報を取得する
* Episode情報を取得する
* Channel情報を補完する
* Episode情報を補完する
* Media情報を補完する
* 全情報を保存する
