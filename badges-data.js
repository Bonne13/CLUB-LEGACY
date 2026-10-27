"use strict";
(function (root) {
  const data = {
    revision: "original-1",
    assets: {
      "flag-ar.png": "assets/badges/flag-ar.png",
      "flag-at.png": "assets/badges/flag-at.png",
      "flag-au.png": "assets/badges/flag-au.png",
      "flag-be.png": "assets/badges/flag-be.png",
      "flag-bo.png": "assets/badges/flag-bo.png",
      "flag-br.png": "assets/badges/flag-br.png",
      "flag-ca.png": "assets/badges/flag-ca.png",
      "flag-ch.png": "assets/badges/flag-ch.png",
      "flag-ci.png": "assets/badges/flag-ci.png",
      "flag-cl.png": "assets/badges/flag-cl.png",
      "flag-cm.png": "assets/badges/flag-cm.png",
      "flag-co.png": "assets/badges/flag-co.png",
      "flag-cr.png": "assets/badges/flag-cr.png",
      "flag-cz.png": "assets/badges/flag-cz.png",
      "flag-de.png": "assets/badges/flag-de.png",
      "flag-dk.png": "assets/badges/flag-dk.png",
      "flag-dz.png": "assets/badges/flag-dz.png",
      "flag-ec.png": "assets/badges/flag-ec.png",
      "flag-eg.png": "assets/badges/flag-eg.png",
      "flag-es.png": "assets/badges/flag-es.png",
      "flag-fr.png": "assets/badges/flag-fr.png",
      "flag-gb-eng.png": "assets/badges/flag-gb-eng.png",
      "flag-gb-sct.png": "assets/badges/flag-gb-sct.png",
      "flag-gb-wls.png": "assets/badges/flag-gb-wls.png",
      "flag-gh.png": "assets/badges/flag-gh.png",
      "flag-gr.png": "assets/badges/flag-gr.png",
      "flag-hr.png": "assets/badges/flag-hr.png",
      "flag-ie.png": "assets/badges/flag-ie.png",
      "flag-ir.png": "assets/badges/flag-ir.png",
      "flag-it.png": "assets/badges/flag-it.png",
      "flag-jm.png": "assets/badges/flag-jm.png",
      "flag-jp.png": "assets/badges/flag-jp.png",
      "flag-kr.png": "assets/badges/flag-kr.png",
      "flag-ma.png": "assets/badges/flag-ma.png",
      "flag-mx.png": "assets/badges/flag-mx.png",
      "flag-ng.png": "assets/badges/flag-ng.png",
      "flag-nl.png": "assets/badges/flag-nl.png",
      "flag-no.png": "assets/badges/flag-no.png",
      "flag-nz.png": "assets/badges/flag-nz.png",
      "flag-pe.png": "assets/badges/flag-pe.png",
      "flag-pl.png": "assets/badges/flag-pl.png",
      "flag-pt.png": "assets/badges/flag-pt.png",
      "flag-py.png": "assets/badges/flag-py.png",
      "flag-rs.png": "assets/badges/flag-rs.png",
      "flag-sa.png": "assets/badges/flag-sa.png",
      "flag-se.png": "assets/badges/flag-se.png",
      "flag-sn.png": "assets/badges/flag-sn.png",
      "flag-tr.png": "assets/badges/flag-tr.png",
      "flag-ua.png": "assets/badges/flag-ua.png",
      "flag-us.png": "assets/badges/flag-us.png",
      "flag-uy.png": "assets/badges/flag-uy.png",
      "flag-ve.png": "assets/badges/flag-ve.png",
      "flag-za.png": "assets/badges/flag-za.png",
      "original-0017739db94fdc.svg":
        "assets/badges/original-0017739db94fdc.svg",
      "original-008be6875298f5.svg":
        "assets/badges/original-008be6875298f5.svg",
      "original-01735c5ff16087.svg":
        "assets/badges/original-01735c5ff16087.svg",
      "original-02cdd331feda2a.svg":
        "assets/badges/original-02cdd331feda2a.svg",
      "original-02f7162d60bf12.svg":
        "assets/badges/original-02f7162d60bf12.svg",
      "original-030f424ea0bb64.svg":
        "assets/badges/original-030f424ea0bb64.svg",
      "original-0350634061ab3c.svg":
        "assets/badges/original-0350634061ab3c.svg",
      "original-0385d89114211d.svg":
        "assets/badges/original-0385d89114211d.svg",
      "original-04b8abb199ba87.svg":
        "assets/badges/original-04b8abb199ba87.svg",
      "original-0582f4223d9a3c.svg":
        "assets/badges/original-0582f4223d9a3c.svg",
      "original-0637e04572f640.svg":
        "assets/badges/original-0637e04572f640.svg",
      "original-07550f0af9ffd4.svg":
        "assets/badges/original-07550f0af9ffd4.svg",
      "original-080c74cad0233f.svg":
        "assets/badges/original-080c74cad0233f.svg",
      "original-08537182ea85e9.svg":
        "assets/badges/original-08537182ea85e9.svg",
      "original-0921c87786172e.svg":
        "assets/badges/original-0921c87786172e.svg",
      "original-099dd595ce6576.svg":
        "assets/badges/original-099dd595ce6576.svg",
      "original-0a3a7da8f0efec.svg":
        "assets/badges/original-0a3a7da8f0efec.svg",
      "original-0af6c3986da78b.svg":
        "assets/badges/original-0af6c3986da78b.svg",
      "original-0b2d9f079cd12a.svg":
        "assets/badges/original-0b2d9f079cd12a.svg",
      "original-0bf974d86c72f1.svg":
        "assets/badges/original-0bf974d86c72f1.svg",
      "original-0c5e15445f995b.svg":
        "assets/badges/original-0c5e15445f995b.svg",
      "original-0df2b318462f5a.svg":
        "assets/badges/original-0df2b318462f5a.svg",
      "original-0eb286e8cb40c0.svg":
        "assets/badges/original-0eb286e8cb40c0.svg",
      "original-0ed9c3e264df41.svg":
        "assets/badges/original-0ed9c3e264df41.svg",
      "original-0eefcdd6e5d0a5.svg":
        "assets/badges/original-0eefcdd6e5d0a5.svg",
      "original-105198f08f096b.svg":
        "assets/badges/original-105198f08f096b.svg",
      "original-1067936ba29c8a.svg":
        "assets/badges/original-1067936ba29c8a.svg",
      "original-108bd0766bf42a.svg":
        "assets/badges/original-108bd0766bf42a.svg",
      "original-11148d8f6ad4d4.svg":
        "assets/badges/original-11148d8f6ad4d4.svg",
      "original-113052d87118bd.svg":
        "assets/badges/original-113052d87118bd.svg",
      "original-11dc72589ed82d.svg":
        "assets/badges/original-11dc72589ed82d.svg",
      "original-11ef08e9306614.svg":
        "assets/badges/original-11ef08e9306614.svg",
      "original-126f214023a030.svg":
        "assets/badges/original-126f214023a030.svg",
      "original-13129b09d0934a.svg":
        "assets/badges/original-13129b09d0934a.svg",
      "original-132b44a3745a94.svg":
        "assets/badges/original-132b44a3745a94.svg",
      "original-1382dca91398a1.svg":
        "assets/badges/original-1382dca91398a1.svg",
      "original-1534cf2af76ecd.svg":
        "assets/badges/original-1534cf2af76ecd.svg",
      "original-15c6d611193988.svg":
        "assets/badges/original-15c6d611193988.svg",
      "original-1627a9f7b693c9.svg":
        "assets/badges/original-1627a9f7b693c9.svg",
      "original-1666a289fa9875.svg":
        "assets/badges/original-1666a289fa9875.svg",
      "original-170c4efbf64c7f.svg":
        "assets/badges/original-170c4efbf64c7f.svg",
      "original-17a65f2f9937c0.svg":
        "assets/badges/original-17a65f2f9937c0.svg",
      "original-18cd53867bcbba.svg":
        "assets/badges/original-18cd53867bcbba.svg",
      "original-1a12d59363af28.svg":
        "assets/badges/original-1a12d59363af28.svg",
      "original-1c33ac6f1f97b3.svg":
        "assets/badges/original-1c33ac6f1f97b3.svg",
      "original-1c4c961ee71813.svg":
        "assets/badges/original-1c4c961ee71813.svg",
      "original-1dbd7dfe35d468.svg":
        "assets/badges/original-1dbd7dfe35d468.svg",
      "original-1ecd41c03ef78b.svg":
        "assets/badges/original-1ecd41c03ef78b.svg",
      "original-1f4f01dd5ab726.svg":
        "assets/badges/original-1f4f01dd5ab726.svg",
      "original-2049907ef04e94.svg":
        "assets/badges/original-2049907ef04e94.svg",
      "original-213a5031760024.svg":
        "assets/badges/original-213a5031760024.svg",
      "original-2183027e204015.svg":
        "assets/badges/original-2183027e204015.svg",
      "original-21f4f2974c5b99.svg":
        "assets/badges/original-21f4f2974c5b99.svg",
      "original-22eeb0bc430c1c.svg":
        "assets/badges/original-22eeb0bc430c1c.svg",
      "original-23196a2a84e36d.svg":
        "assets/badges/original-23196a2a84e36d.svg",
      "original-231b1156c6445c.svg":
        "assets/badges/original-231b1156c6445c.svg",
      "original-233c761b095305.svg":
        "assets/badges/original-233c761b095305.svg",
      "original-23934147080990.svg":
        "assets/badges/original-23934147080990.svg",
      "original-23b611dc72bae9.svg":
        "assets/badges/original-23b611dc72bae9.svg",
      "original-242aaa92a02d7f.svg":
        "assets/badges/original-242aaa92a02d7f.svg",
      "original-25277b0ab9dcd0.svg":
        "assets/badges/original-25277b0ab9dcd0.svg",
      "original-259431f28f16a7.svg":
        "assets/badges/original-259431f28f16a7.svg",
      "original-25e650426bbf0d.svg":
        "assets/badges/original-25e650426bbf0d.svg",
      "original-27052dea936da6.svg":
        "assets/badges/original-27052dea936da6.svg",
      "original-2727b4974efc6e.svg":
        "assets/badges/original-2727b4974efc6e.svg",
      "original-278966f8b4c560.svg":
        "assets/badges/original-278966f8b4c560.svg",
      "original-28acfad0ff8203.svg":
        "assets/badges/original-28acfad0ff8203.svg",
      "original-28eeff6c59ad54.svg":
        "assets/badges/original-28eeff6c59ad54.svg",
      "original-295e92b5d918d7.svg":
        "assets/badges/original-295e92b5d918d7.svg",
      "original-2ab4a454502b41.svg":
        "assets/badges/original-2ab4a454502b41.svg",
      "original-2ac4296d076e4e.svg":
        "assets/badges/original-2ac4296d076e4e.svg",
      "original-2ae8d797a6ecd7.svg":
        "assets/badges/original-2ae8d797a6ecd7.svg",
      "original-2baf2836799bcf.svg":
        "assets/badges/original-2baf2836799bcf.svg",
      "original-2ced3e41fa1815.svg":
        "assets/badges/original-2ced3e41fa1815.svg",
      "original-2e5d7cb7a53c51.svg":
        "assets/badges/original-2e5d7cb7a53c51.svg",
      "original-301b7dcffefc6b.svg":
        "assets/badges/original-301b7dcffefc6b.svg",
      "original-306ae847a44bc0.svg":
        "assets/badges/original-306ae847a44bc0.svg",
      "original-308cf262347c9f.svg":
        "assets/badges/original-308cf262347c9f.svg",
      "original-309cf6f8eda4f3.svg":
        "assets/badges/original-309cf6f8eda4f3.svg",
      "original-32a77484e0d82d.svg":
        "assets/badges/original-32a77484e0d82d.svg",
      "original-342f43aedf7be2.svg":
        "assets/badges/original-342f43aedf7be2.svg",
      "original-34647d8798a88d.svg":
        "assets/badges/original-34647d8798a88d.svg",
      "original-36ca70f4e5025c.svg":
        "assets/badges/original-36ca70f4e5025c.svg",
      "original-37895dfa26402a.svg":
        "assets/badges/original-37895dfa26402a.svg",
      "original-384658cd94a64f.svg":
        "assets/badges/original-384658cd94a64f.svg",
      "original-385f8f79371964.svg":
        "assets/badges/original-385f8f79371964.svg",
      "original-39d742c56ae8cc.svg":
        "assets/badges/original-39d742c56ae8cc.svg",
      "original-3a08cf3ef1f804.svg":
        "assets/badges/original-3a08cf3ef1f804.svg",
      "original-3aac28fd826770.svg":
        "assets/badges/original-3aac28fd826770.svg",
      "original-3b76c8e0266c4c.svg":
        "assets/badges/original-3b76c8e0266c4c.svg",
      "original-3cbdfd87da999f.svg":
        "assets/badges/original-3cbdfd87da999f.svg",
      "original-3cc71f38946c2f.svg":
        "assets/badges/original-3cc71f38946c2f.svg",
      "original-3e3615ec3811a2.svg":
        "assets/badges/original-3e3615ec3811a2.svg",
      "original-3ef249cab88399.svg":
        "assets/badges/original-3ef249cab88399.svg",
      "original-3f4634466a9ac3.svg":
        "assets/badges/original-3f4634466a9ac3.svg",
      "original-405ff137e5e411.svg":
        "assets/badges/original-405ff137e5e411.svg",
      "original-40cea1fd091baf.svg":
        "assets/badges/original-40cea1fd091baf.svg",
      "original-4265559e75e90f.svg":
        "assets/badges/original-4265559e75e90f.svg",
      "original-42b5ff547e7fbc.svg":
        "assets/badges/original-42b5ff547e7fbc.svg",
      "original-43385e411ef944.svg":
        "assets/badges/original-43385e411ef944.svg",
      "original-448146261188a4.svg":
        "assets/badges/original-448146261188a4.svg",
      "original-45643fcbe9784d.svg":
        "assets/badges/original-45643fcbe9784d.svg",
      "original-471d553d58d2f1.svg":
        "assets/badges/original-471d553d58d2f1.svg",
      "original-477a89c66f44ad.svg":
        "assets/badges/original-477a89c66f44ad.svg",
      "original-4794ab21564d35.svg":
        "assets/badges/original-4794ab21564d35.svg",
      "original-47e26a1b78b95a.svg":
        "assets/badges/original-47e26a1b78b95a.svg",
      "original-4ab8dbacfc4dc5.svg":
        "assets/badges/original-4ab8dbacfc4dc5.svg",
      "original-4ad81a18cd00d3.svg":
        "assets/badges/original-4ad81a18cd00d3.svg",
      "original-4b25105c7d86fa.svg":
        "assets/badges/original-4b25105c7d86fa.svg",
      "original-4b826b02a59a8a.svg":
        "assets/badges/original-4b826b02a59a8a.svg",
      "original-4bae064671250a.svg":
        "assets/badges/original-4bae064671250a.svg",
      "original-4bee8a0051fdd2.svg":
        "assets/badges/original-4bee8a0051fdd2.svg",
      "original-4cd8e7a58a4ff9.svg":
        "assets/badges/original-4cd8e7a58a4ff9.svg",
      "original-4e4ec7c99bc1b9.svg":
        "assets/badges/original-4e4ec7c99bc1b9.svg",
      "original-4e573a4a9c5b53.svg":
        "assets/badges/original-4e573a4a9c5b53.svg",
      "original-4e611a995fb9b8.svg":
        "assets/badges/original-4e611a995fb9b8.svg",
      "original-4fc160adcf968c.svg":
        "assets/badges/original-4fc160adcf968c.svg",
      "original-4fc60038a6190a.svg":
        "assets/badges/original-4fc60038a6190a.svg",
      "original-5005bcc5ccd788.svg":
        "assets/badges/original-5005bcc5ccd788.svg",
      "original-50a7067d924c9c.svg":
        "assets/badges/original-50a7067d924c9c.svg",
      "original-5288e20d45360e.svg":
        "assets/badges/original-5288e20d45360e.svg",
      "original-536b8ff293feaa.svg":
        "assets/badges/original-536b8ff293feaa.svg",
      "original-53946ba3c31279.svg":
        "assets/badges/original-53946ba3c31279.svg",
      "original-54141373db1eee.svg":
        "assets/badges/original-54141373db1eee.svg",
      "original-545f91326c4e8b.svg":
        "assets/badges/original-545f91326c4e8b.svg",
      "original-546b6448aad768.svg":
        "assets/badges/original-546b6448aad768.svg",
      "original-5483d5df9b245e.svg":
        "assets/badges/original-5483d5df9b245e.svg",
      "original-55a2411c28949c.svg":
        "assets/badges/original-55a2411c28949c.svg",
      "original-5750bae2d7818f.svg":
        "assets/badges/original-5750bae2d7818f.svg",
      "original-578e07faeeb3c4.svg":
        "assets/badges/original-578e07faeeb3c4.svg",
      "original-58df625253c9a7.svg":
        "assets/badges/original-58df625253c9a7.svg",
      "original-5932b1a8b1d0dd.svg":
        "assets/badges/original-5932b1a8b1d0dd.svg",
      "original-5a15316fba78f4.svg":
        "assets/badges/original-5a15316fba78f4.svg",
      "original-5a49be55773f5b.svg":
        "assets/badges/original-5a49be55773f5b.svg",
      "original-5ac1ace0e4497d.svg":
        "assets/badges/original-5ac1ace0e4497d.svg",
      "original-5b0e6767971373.svg":
        "assets/badges/original-5b0e6767971373.svg",
      "original-5d6f7db8fce02a.svg":
        "assets/badges/original-5d6f7db8fce02a.svg",
      "original-5d88a03e611899.svg":
        "assets/badges/original-5d88a03e611899.svg",
      "original-5dfcbdf7895956.svg":
        "assets/badges/original-5dfcbdf7895956.svg",
      "original-5e487a6a362c28.svg":
        "assets/badges/original-5e487a6a362c28.svg",
      "original-5e9d7a1fde38be.svg":
        "assets/badges/original-5e9d7a1fde38be.svg",
      "original-5ecfb8df4af87f.svg":
        "assets/badges/original-5ecfb8df4af87f.svg",
      "original-5ee3fdf4b47bd5.svg":
        "assets/badges/original-5ee3fdf4b47bd5.svg",
      "original-5ef1c9f20a5a71.svg":
        "assets/badges/original-5ef1c9f20a5a71.svg",
      "original-5f0d364b5a8e7a.svg":
        "assets/badges/original-5f0d364b5a8e7a.svg",
      "original-5f110ca0212ab1.svg":
        "assets/badges/original-5f110ca0212ab1.svg",
      "original-5f16a64934b51d.svg":
        "assets/badges/original-5f16a64934b51d.svg",
      "original-5f80b32380c53a.svg":
        "assets/badges/original-5f80b32380c53a.svg",
      "original-5ffc7dfc876eca.svg":
        "assets/badges/original-5ffc7dfc876eca.svg",
      "original-60eb30c4c4620d.svg":
        "assets/badges/original-60eb30c4c4620d.svg",
      "original-61ad8f7fa19ae2.svg":
        "assets/badges/original-61ad8f7fa19ae2.svg",
      "original-61edad3fb27cf0.svg":
        "assets/badges/original-61edad3fb27cf0.svg",
      "original-626b208a365327.svg":
        "assets/badges/original-626b208a365327.svg",
      "original-628d5f40c0b324.svg":
        "assets/badges/original-628d5f40c0b324.svg",
      "original-62ba8e1464c13e.svg":
        "assets/badges/original-62ba8e1464c13e.svg",
      "original-62f8b67236e1b5.svg":
        "assets/badges/original-62f8b67236e1b5.svg",
      "original-6334dee5252449.svg":
        "assets/badges/original-6334dee5252449.svg",
      "original-63cf1eb27691c9.svg":
        "assets/badges/original-63cf1eb27691c9.svg",
      "original-64daa95b808018.svg":
        "assets/badges/original-64daa95b808018.svg",
      "original-650a26c3640c8a.svg":
        "assets/badges/original-650a26c3640c8a.svg",
      "original-667160bb7dcafc.svg":
        "assets/badges/original-667160bb7dcafc.svg",
      "original-669dc1db6dc80b.svg":
        "assets/badges/original-669dc1db6dc80b.svg",
      "original-68ef7f48796ade.svg":
        "assets/badges/original-68ef7f48796ade.svg",
      "original-6afb5e008b7f9e.svg":
        "assets/badges/original-6afb5e008b7f9e.svg",
      "original-6b08b708fbed2e.svg":
        "assets/badges/original-6b08b708fbed2e.svg",
      "original-6b828aeb754061.svg":
        "assets/badges/original-6b828aeb754061.svg",
      "original-6d290cf8979c69.svg":
        "assets/badges/original-6d290cf8979c69.svg",
      "original-6e97caf1910c92.svg":
        "assets/badges/original-6e97caf1910c92.svg",
      "original-6eded4e498617d.svg":
        "assets/badges/original-6eded4e498617d.svg",
      "original-6f92f0167ad073.svg":
        "assets/badges/original-6f92f0167ad073.svg",
      "original-6fef4472df5521.svg":
        "assets/badges/original-6fef4472df5521.svg",
      "original-70528be54163fe.svg":
        "assets/badges/original-70528be54163fe.svg",
      "original-71043d70252539.svg":
        "assets/badges/original-71043d70252539.svg",
      "original-715edf8ba87294.svg":
        "assets/badges/original-715edf8ba87294.svg",
      "original-72028c69fe5859.svg":
        "assets/badges/original-72028c69fe5859.svg",
      "original-72adc7dc3a6270.svg":
        "assets/badges/original-72adc7dc3a6270.svg",
      "original-739ceba7b07393.svg":
        "assets/badges/original-739ceba7b07393.svg",
      "original-742df99fe0bc39.svg":
        "assets/badges/original-742df99fe0bc39.svg",
      "original-7438b640fba921.svg":
        "assets/badges/original-7438b640fba921.svg",
      "original-752eea38ab97fd.svg":
        "assets/badges/original-752eea38ab97fd.svg",
      "original-760791825f1335.svg":
        "assets/badges/original-760791825f1335.svg",
      "original-7619d687372e05.svg":
        "assets/badges/original-7619d687372e05.svg",
      "original-767fc64ce31d98.svg":
        "assets/badges/original-767fc64ce31d98.svg",
      "original-76ad7747516ce6.svg":
        "assets/badges/original-76ad7747516ce6.svg",
      "original-76b6ab8321f6c7.svg":
        "assets/badges/original-76b6ab8321f6c7.svg",
      "original-76c88b0a737261.svg":
        "assets/badges/original-76c88b0a737261.svg",
      "original-774183b41e2c10.svg":
        "assets/badges/original-774183b41e2c10.svg",
      "original-777a30046167fc.svg":
        "assets/badges/original-777a30046167fc.svg",
      "original-7825b3a1a4f58b.svg":
        "assets/badges/original-7825b3a1a4f58b.svg",
      "original-783f41c994d41a.svg":
        "assets/badges/original-783f41c994d41a.svg",
      "original-79996373623b60.svg":
        "assets/badges/original-79996373623b60.svg",
      "original-7a31c276744b66.svg":
        "assets/badges/original-7a31c276744b66.svg",
      "original-7afcaccd304efd.svg":
        "assets/badges/original-7afcaccd304efd.svg",
      "original-7c8159dd2e49a5.svg":
        "assets/badges/original-7c8159dd2e49a5.svg",
      "original-7c82602500857a.svg":
        "assets/badges/original-7c82602500857a.svg",
      "original-7cabadb8331090.svg":
        "assets/badges/original-7cabadb8331090.svg",
      "original-7cb4e2a1388dad.svg":
        "assets/badges/original-7cb4e2a1388dad.svg",
      "original-7cc269eaadbcc4.svg":
        "assets/badges/original-7cc269eaadbcc4.svg",
      "original-7df8a68cb2d987.svg":
        "assets/badges/original-7df8a68cb2d987.svg",
      "original-7e85b195803780.svg":
        "assets/badges/original-7e85b195803780.svg",
      "original-7f3b9b0e0a765d.svg":
        "assets/badges/original-7f3b9b0e0a765d.svg",
      "original-7fb5b505920a4b.svg":
        "assets/badges/original-7fb5b505920a4b.svg",
      "original-80d4f92371f0c2.svg":
        "assets/badges/original-80d4f92371f0c2.svg",
      "original-812b9215cd2f0e.svg":
        "assets/badges/original-812b9215cd2f0e.svg",
      "original-828ab0d90425b0.svg":
        "assets/badges/original-828ab0d90425b0.svg",
      "original-82d31938a5088e.svg":
        "assets/badges/original-82d31938a5088e.svg",
      "original-8500dd3916cfdd.svg":
        "assets/badges/original-8500dd3916cfdd.svg",
      "original-85a9aae459569d.svg":
        "assets/badges/original-85a9aae459569d.svg",
      "original-8617b1495b83c3.svg":
        "assets/badges/original-8617b1495b83c3.svg",
      "original-864023960423af.svg":
        "assets/badges/original-864023960423af.svg",
      "original-86bdaad31a9d37.svg":
        "assets/badges/original-86bdaad31a9d37.svg",
      "original-87b8efa10d8ecc.svg":
        "assets/badges/original-87b8efa10d8ecc.svg",
      "original-87fef07bf984ee.svg":
        "assets/badges/original-87fef07bf984ee.svg",
      "original-88609184c61624.svg":
        "assets/badges/original-88609184c61624.svg",
      "original-886b904b012dd0.svg":
        "assets/badges/original-886b904b012dd0.svg",
      "original-8870e6cbc01473.svg":
        "assets/badges/original-8870e6cbc01473.svg",
      "original-88eae1f2542c4e.svg":
        "assets/badges/original-88eae1f2542c4e.svg",
      "original-89f1921a62c69b.svg":
        "assets/badges/original-89f1921a62c69b.svg",
      "original-8a713ff5ac700c.svg":
        "assets/badges/original-8a713ff5ac700c.svg",
      "original-8b36588118b6f5.svg":
        "assets/badges/original-8b36588118b6f5.svg",
      "original-8b4c41d26912eb.svg":
        "assets/badges/original-8b4c41d26912eb.svg",
      "original-8b651d9ed6ca98.svg":
        "assets/badges/original-8b651d9ed6ca98.svg",
      "original-8ba44810bc725d.svg":
        "assets/badges/original-8ba44810bc725d.svg",
      "original-8bb453ba636b71.svg":
        "assets/badges/original-8bb453ba636b71.svg",
      "original-8cd270073b55a1.svg":
        "assets/badges/original-8cd270073b55a1.svg",
      "original-8d294eb556df7e.svg":
        "assets/badges/original-8d294eb556df7e.svg",
      "original-8d4c4ec664410f.svg":
        "assets/badges/original-8d4c4ec664410f.svg",
      "original-8e7bfd10ebcb05.svg":
        "assets/badges/original-8e7bfd10ebcb05.svg",
      "original-8f266a0a15f348.svg":
        "assets/badges/original-8f266a0a15f348.svg",
      "original-8f29a0c8dabfc0.svg":
        "assets/badges/original-8f29a0c8dabfc0.svg",
      "original-8f7f2f7ccd3f28.svg":
        "assets/badges/original-8f7f2f7ccd3f28.svg",
      "original-8fc0293969dac5.svg":
        "assets/badges/original-8fc0293969dac5.svg",
      "original-9086cdf9770bb6.svg":
        "assets/badges/original-9086cdf9770bb6.svg",
      "original-917e53c1305a63.svg":
        "assets/badges/original-917e53c1305a63.svg",
      "original-91ae7ecf20a7ab.svg":
        "assets/badges/original-91ae7ecf20a7ab.svg",
      "original-92dec88dbd585f.svg":
        "assets/badges/original-92dec88dbd585f.svg",
      "original-933a7380cb1109.svg":
        "assets/badges/original-933a7380cb1109.svg",
      "original-9465e4584d6b48.svg":
        "assets/badges/original-9465e4584d6b48.svg",
      "original-950324b21dc5d0.svg":
        "assets/badges/original-950324b21dc5d0.svg",
      "original-954fd15b13737d.svg":
        "assets/badges/original-954fd15b13737d.svg",
      "original-96681c1de46dca.svg":
        "assets/badges/original-96681c1de46dca.svg",
      "original-97d4e341ca6436.svg":
        "assets/badges/original-97d4e341ca6436.svg",
      "original-989468f5d9c435.svg":
        "assets/badges/original-989468f5d9c435.svg",
      "original-99e2b58c8c58d8.svg":
        "assets/badges/original-99e2b58c8c58d8.svg",
      "original-9a58c3f2e6b99b.svg":
        "assets/badges/original-9a58c3f2e6b99b.svg",
      "original-9b1d1f559116de.svg":
        "assets/badges/original-9b1d1f559116de.svg",
      "original-9b650274a60e6f.svg":
        "assets/badges/original-9b650274a60e6f.svg",
      "original-9b6e27e377e036.svg":
        "assets/badges/original-9b6e27e377e036.svg",
      "original-9b70e5225ecc3e.svg":
        "assets/badges/original-9b70e5225ecc3e.svg",
      "original-9b89025ce7a6d9.svg":
        "assets/badges/original-9b89025ce7a6d9.svg",
      "original-9ce21eac3a5cb6.svg":
        "assets/badges/original-9ce21eac3a5cb6.svg",
      "original-9d5bb828b837fe.svg":
        "assets/badges/original-9d5bb828b837fe.svg",
      "original-9db2b735d93e83.svg":
        "assets/badges/original-9db2b735d93e83.svg",
      "original-9dc5bad7a55031.svg":
        "assets/badges/original-9dc5bad7a55031.svg",
      "original-9e351dcbee1983.svg":
        "assets/badges/original-9e351dcbee1983.svg",
      "original-9e84dc2a8cde9f.svg":
        "assets/badges/original-9e84dc2a8cde9f.svg",
      "original-9e861941ad8bf5.svg":
        "assets/badges/original-9e861941ad8bf5.svg",
      "original-9f190d0d641acf.svg":
        "assets/badges/original-9f190d0d641acf.svg",
      "original-9f97b71bbbb848.svg":
        "assets/badges/original-9f97b71bbbb848.svg",
      "original-a0152061d6a032.svg":
        "assets/badges/original-a0152061d6a032.svg",
      "original-a079a0da42a428.svg":
        "assets/badges/original-a079a0da42a428.svg",
      "original-a26915b4ef4993.svg":
        "assets/badges/original-a26915b4ef4993.svg",
      "original-a34b40d010af11.svg":
        "assets/badges/original-a34b40d010af11.svg",
      "original-a397c3e431ec77.svg":
        "assets/badges/original-a397c3e431ec77.svg",
      "original-a41bd2420ce218.svg":
        "assets/badges/original-a41bd2420ce218.svg",
      "original-a4be5add023d49.svg":
        "assets/badges/original-a4be5add023d49.svg",
      "original-a4ca2054508518.svg":
        "assets/badges/original-a4ca2054508518.svg",
      "original-a52cbb7f1af3e9.svg":
        "assets/badges/original-a52cbb7f1af3e9.svg",
      "original-a5f3cf1c18f917.svg":
        "assets/badges/original-a5f3cf1c18f917.svg",
      "original-a62d13a1b5f0b7.svg":
        "assets/badges/original-a62d13a1b5f0b7.svg",
      "original-a673e87911497f.svg":
        "assets/badges/original-a673e87911497f.svg",
      "original-a7181364574015.svg":
        "assets/badges/original-a7181364574015.svg",
      "original-a73cf33ef680a2.svg":
        "assets/badges/original-a73cf33ef680a2.svg",
      "original-a78ac513b8d641.svg":
        "assets/badges/original-a78ac513b8d641.svg",
      "original-a8195c452ddb70.svg":
        "assets/badges/original-a8195c452ddb70.svg",
      "original-a95d0ac8c57fe4.svg":
        "assets/badges/original-a95d0ac8c57fe4.svg",
      "original-a985759c9db4b2.svg":
        "assets/badges/original-a985759c9db4b2.svg",
      "original-abd20b0f073652.svg":
        "assets/badges/original-abd20b0f073652.svg",
      "original-acc2cab42640dd.svg":
        "assets/badges/original-acc2cab42640dd.svg",
      "original-adf507fc027afe.svg":
        "assets/badges/original-adf507fc027afe.svg",
      "original-ae4a1b349a98b4.svg":
        "assets/badges/original-ae4a1b349a98b4.svg",
      "original-aeb53a7c9cde15.svg":
        "assets/badges/original-aeb53a7c9cde15.svg",
      "original-aedd4473a5048c.svg":
        "assets/badges/original-aedd4473a5048c.svg",
      "original-af0cf99b839a6c.svg":
        "assets/badges/original-af0cf99b839a6c.svg",
      "original-af0f0108f0bcd6.svg":
        "assets/badges/original-af0f0108f0bcd6.svg",
      "original-af52da8fdd1f6d.svg":
        "assets/badges/original-af52da8fdd1f6d.svg",
      "original-b0bfc163036b51.svg":
        "assets/badges/original-b0bfc163036b51.svg",
      "original-b0c27fca74fa91.svg":
        "assets/badges/original-b0c27fca74fa91.svg",
      "original-b2c3a52b284f6f.svg":
        "assets/badges/original-b2c3a52b284f6f.svg",
      "original-b45fae26bcdd54.svg":
        "assets/badges/original-b45fae26bcdd54.svg",
      "original-b4895b93392d68.svg":
        "assets/badges/original-b4895b93392d68.svg",
      "original-b4a53bd82f8c8d.svg":
        "assets/badges/original-b4a53bd82f8c8d.svg",
      "original-b4a8782df29c96.svg":
        "assets/badges/original-b4a8782df29c96.svg",
      "original-b4aeb7162f385b.svg":
        "assets/badges/original-b4aeb7162f385b.svg",
      "original-b5239761f0075b.svg":
        "assets/badges/original-b5239761f0075b.svg",
      "original-b536a2876f25bd.svg":
        "assets/badges/original-b536a2876f25bd.svg",
      "original-b70e859bdb691a.svg":
        "assets/badges/original-b70e859bdb691a.svg",
      "original-b83de8521ec258.svg":
        "assets/badges/original-b83de8521ec258.svg",
      "original-b8f42a33d6c81f.svg":
        "assets/badges/original-b8f42a33d6c81f.svg",
      "original-b92a0b4bfc4a66.svg":
        "assets/badges/original-b92a0b4bfc4a66.svg",
      "original-b9a2c0c9e15b02.svg":
        "assets/badges/original-b9a2c0c9e15b02.svg",
      "original-ba9a54475412e7.svg":
        "assets/badges/original-ba9a54475412e7.svg",
      "original-bac07b951db6e1.svg":
        "assets/badges/original-bac07b951db6e1.svg",
      "original-bac3176504a8fe.svg":
        "assets/badges/original-bac3176504a8fe.svg",
      "original-bae6729079741c.svg":
        "assets/badges/original-bae6729079741c.svg",
      "original-bb1746bcf9261e.svg":
        "assets/badges/original-bb1746bcf9261e.svg",
      "original-bb9d03c00eb898.svg":
        "assets/badges/original-bb9d03c00eb898.svg",
      "original-bbf9dee91d983f.svg":
        "assets/badges/original-bbf9dee91d983f.svg",
      "original-bd7178acf59a20.svg":
        "assets/badges/original-bd7178acf59a20.svg",
      "original-bda11b42d148b3.svg":
        "assets/badges/original-bda11b42d148b3.svg",
      "original-bdc441631b8a37.svg":
        "assets/badges/original-bdc441631b8a37.svg",
      "original-bdc5ce96d0bfd0.svg":
        "assets/badges/original-bdc5ce96d0bfd0.svg",
      "original-be1807d21a1102.svg":
        "assets/badges/original-be1807d21a1102.svg",
      "original-be83f6d5677550.svg":
        "assets/badges/original-be83f6d5677550.svg",
      "original-bed942d84bc947.svg":
        "assets/badges/original-bed942d84bc947.svg",
      "original-c00fb0b23bf3d1.svg":
        "assets/badges/original-c00fb0b23bf3d1.svg",
      "original-c1143705b37c3d.svg":
        "assets/badges/original-c1143705b37c3d.svg",
      "original-c1e0c2e88f5d68.svg":
        "assets/badges/original-c1e0c2e88f5d68.svg",
      "original-c35f5328c6cd20.svg":
        "assets/badges/original-c35f5328c6cd20.svg",
      "original-c43044a6ef23a2.svg":
        "assets/badges/original-c43044a6ef23a2.svg",
      "original-c48db3ce2b9eee.svg":
        "assets/badges/original-c48db3ce2b9eee.svg",
      "original-c49cf0094c04b2.svg":
        "assets/badges/original-c49cf0094c04b2.svg",
      "original-c4a4e1d8f2f61f.svg":
        "assets/badges/original-c4a4e1d8f2f61f.svg",
      "original-c6980a21481dad.svg":
        "assets/badges/original-c6980a21481dad.svg",
      "original-c7736aea27f345.svg":
        "assets/badges/original-c7736aea27f345.svg",
      "original-c84ba7d16b33e5.svg":
        "assets/badges/original-c84ba7d16b33e5.svg",
      "original-c93d96f7f07fbd.svg":
        "assets/badges/original-c93d96f7f07fbd.svg",
      "original-c940429f4dcb49.svg":
        "assets/badges/original-c940429f4dcb49.svg",
      "original-ca9e6517632557.svg":
        "assets/badges/original-ca9e6517632557.svg",
      "original-cb6b0140a169a6.svg":
        "assets/badges/original-cb6b0140a169a6.svg",
      "original-cbb3895904f679.svg":
        "assets/badges/original-cbb3895904f679.svg",
      "original-cbf2f43a43856d.svg":
        "assets/badges/original-cbf2f43a43856d.svg",
      "original-cd0351b5130abe.svg":
        "assets/badges/original-cd0351b5130abe.svg",
      "original-cd1a80dd2052f2.svg":
        "assets/badges/original-cd1a80dd2052f2.svg",
      "original-cd2206729d2b8d.svg":
        "assets/badges/original-cd2206729d2b8d.svg",
      "original-cd5e264ed34422.svg":
        "assets/badges/original-cd5e264ed34422.svg",
      "original-ce7758352ca3ba.svg":
        "assets/badges/original-ce7758352ca3ba.svg",
      "original-cecc9d1e1a2c04.svg":
        "assets/badges/original-cecc9d1e1a2c04.svg",
      "original-ced2b494918909.svg":
        "assets/badges/original-ced2b494918909.svg",
      "original-cf07a92378cbfc.svg":
        "assets/badges/original-cf07a92378cbfc.svg",
      "original-cf1301e0bafc39.svg":
        "assets/badges/original-cf1301e0bafc39.svg",
      "original-cf41e3028f10bb.svg":
        "assets/badges/original-cf41e3028f10bb.svg",
      "original-cf83e7771e6362.svg":
        "assets/badges/original-cf83e7771e6362.svg",
      "original-cfe27adc8f53d8.svg":
        "assets/badges/original-cfe27adc8f53d8.svg",
      "original-d0fd88044fd502.svg":
        "assets/badges/original-d0fd88044fd502.svg",
      "original-d11ede0b14412a.svg":
        "assets/badges/original-d11ede0b14412a.svg",
      "original-d16c591686d22b.svg":
        "assets/badges/original-d16c591686d22b.svg",
      "original-d1f92f0593ca35.svg":
        "assets/badges/original-d1f92f0593ca35.svg",
      "original-d3bd49c5011ff6.svg":
        "assets/badges/original-d3bd49c5011ff6.svg",
      "original-d4342f053abff4.svg":
        "assets/badges/original-d4342f053abff4.svg",
      "original-d44f2bcf3464e5.svg":
        "assets/badges/original-d44f2bcf3464e5.svg",
      "original-d5136e93e64c91.svg":
        "assets/badges/original-d5136e93e64c91.svg",
      "original-d58d736c7a967f.svg":
        "assets/badges/original-d58d736c7a967f.svg",
      "original-d64baa9c22c9fa.svg":
        "assets/badges/original-d64baa9c22c9fa.svg",
      "original-d6c1efec22846c.svg":
        "assets/badges/original-d6c1efec22846c.svg",
      "original-d6de3e17fe2d2a.svg":
        "assets/badges/original-d6de3e17fe2d2a.svg",
      "original-d6fb74f5bd283a.svg":
        "assets/badges/original-d6fb74f5bd283a.svg",
      "original-d826a57fbaa86c.svg":
        "assets/badges/original-d826a57fbaa86c.svg",
      "original-d9f7dd92c3edda.svg":
        "assets/badges/original-d9f7dd92c3edda.svg",
      "original-dadd47a65108df.svg":
        "assets/badges/original-dadd47a65108df.svg",
      "original-dc48d002e4cee9.svg":
        "assets/badges/original-dc48d002e4cee9.svg",
      "original-dc512f92f0dccd.svg":
        "assets/badges/original-dc512f92f0dccd.svg",
      "original-dd064116b0bbd1.svg":
        "assets/badges/original-dd064116b0bbd1.svg",
      "original-ddece691bb2c6b.svg":
        "assets/badges/original-ddece691bb2c6b.svg",
      "original-ded6a687514227.svg":
        "assets/badges/original-ded6a687514227.svg",
      "original-df79d58cda49d3.svg":
        "assets/badges/original-df79d58cda49d3.svg",
      "original-e03644633d4bf6.svg":
        "assets/badges/original-e03644633d4bf6.svg",
      "original-e0591aac025500.svg":
        "assets/badges/original-e0591aac025500.svg",
      "original-e0ef629c5209fd.svg":
        "assets/badges/original-e0ef629c5209fd.svg",
      "original-e186022d0931af.svg":
        "assets/badges/original-e186022d0931af.svg",
      "original-e2894ed4cfe366.svg":
        "assets/badges/original-e2894ed4cfe366.svg",
      "original-e3f3ea7cd0ae44.svg":
        "assets/badges/original-e3f3ea7cd0ae44.svg",
      "original-e491ab1b9331bc.svg":
        "assets/badges/original-e491ab1b9331bc.svg",
      "original-e5b204cfb8167d.svg":
        "assets/badges/original-e5b204cfb8167d.svg",
      "original-e647708a520607.svg":
        "assets/badges/original-e647708a520607.svg",
      "original-e68b2c7b607a76.svg":
        "assets/badges/original-e68b2c7b607a76.svg",
      "original-e790738858b370.svg":
        "assets/badges/original-e790738858b370.svg",
      "original-e80f7ad27a676e.svg":
        "assets/badges/original-e80f7ad27a676e.svg",
      "original-e879004e0f9892.svg":
        "assets/badges/original-e879004e0f9892.svg",
      "original-e911eeec727080.svg":
        "assets/badges/original-e911eeec727080.svg",
      "original-e986234b0943f4.svg":
        "assets/badges/original-e986234b0943f4.svg",
      "original-ea3dc747f15400.svg":
        "assets/badges/original-ea3dc747f15400.svg",
      "original-eb0d298cd8140f.svg":
        "assets/badges/original-eb0d298cd8140f.svg",
      "original-eb3e0612b16d82.svg":
        "assets/badges/original-eb3e0612b16d82.svg",
      "original-ebeeef29e0a49a.svg":
        "assets/badges/original-ebeeef29e0a49a.svg",
      "original-ec1569a31d2db0.svg":
        "assets/badges/original-ec1569a31d2db0.svg",
      "original-ec450786e26a51.svg":
        "assets/badges/original-ec450786e26a51.svg",
      "original-ec4fd550587bd6.svg":
        "assets/badges/original-ec4fd550587bd6.svg",
      "original-ed188318358e1a.svg":
        "assets/badges/original-ed188318358e1a.svg",
      "original-eef90325620a7d.svg":
        "assets/badges/original-eef90325620a7d.svg",
      "original-ef376b8f315b03.svg":
        "assets/badges/original-ef376b8f315b03.svg",
      "original-efee614420c57d.svg":
        "assets/badges/original-efee614420c57d.svg",
      "original-f00cb6c4922024.svg":
        "assets/badges/original-f00cb6c4922024.svg",
      "original-f04e8efb46e2d7.svg":
        "assets/badges/original-f04e8efb46e2d7.svg",
      "original-f0990dc8a0f70f.svg":
        "assets/badges/original-f0990dc8a0f70f.svg",
      "original-f0de59487a87f0.svg":
        "assets/badges/original-f0de59487a87f0.svg",
      "original-f104b0fa29cb3b.svg":
        "assets/badges/original-f104b0fa29cb3b.svg",
      "original-f335c5dc36f57d.svg":
        "assets/badges/original-f335c5dc36f57d.svg",
      "original-f56206ec0f42e0.svg":
        "assets/badges/original-f56206ec0f42e0.svg",
      "original-f66336cb6323bd.svg":
        "assets/badges/original-f66336cb6323bd.svg",
      "original-f6ae2186c8050d.svg":
        "assets/badges/original-f6ae2186c8050d.svg",
      "original-f797eaa92ec389.svg":
        "assets/badges/original-f797eaa92ec389.svg",
      "original-f7f2ae38c04eb6.svg":
        "assets/badges/original-f7f2ae38c04eb6.svg",
      "original-f828f11c37ac70.svg":
        "assets/badges/original-f828f11c37ac70.svg",
      "original-f96897f277953f.svg":
        "assets/badges/original-f96897f277953f.svg",
      "original-f97557ce9b1cf0.svg":
        "assets/badges/original-f97557ce9b1cf0.svg",
      "original-fa1d5838ef24b1.svg":
        "assets/badges/original-fa1d5838ef24b1.svg",
      "original-fc53333a2b0e82.svg":
        "assets/badges/original-fc53333a2b0e82.svg",
      "original-fd2766fd407496.svg":
        "assets/badges/original-fd2766fd407496.svg",
      "original-fe0bb719b1692a.svg":
        "assets/badges/original-fe0bb719b1692a.svg",
      "original-fe27ee87f62411.svg":
        "assets/badges/original-fe27ee87f62411.svg",
      "original-fe9759b01435d4.svg":
        "assets/badges/original-fe9759b01435d4.svg",
      "original-ff95170fc37105.svg":
        "assets/badges/original-ff95170fc37105.svg",
      "original-ffa15aeed70cd0.svg":
        "assets/badges/original-ffa15aeed70cd0.svg",
      "original-ffa2084d0ce399.svg":
        "assets/badges/original-ffa2084d0ce399.svg",
    },
    clubs: {
      Flamengo: "original-d58d736c7a967f.svg",
      Palmeiras: "original-2ac4296d076e4e.svg",
      Cruzeiro: "original-a673e87911497f.svg",
      Mirassol: "original-cf07a92378cbfc.svg",
      Fluminense: "original-f828f11c37ac70.svg",
      Botafogo: "original-ded6a687514227.svg",
      Bahia: "original-6334dee5252449.svg",
      "São Paulo": "original-8f7f2f7ccd3f28.svg",
      Grêmio: "original-d11ede0b14412a.svg",
      "Red Bull Bragantino": "original-dc48d002e4cee9.svg",
      "Atlético Mineiro": "original-bd7178acf59a20.svg",
      Santos: "original-0df2b318462f5a.svg",
      Corinthians: "original-45643fcbe9784d.svg",
      "Vasco da Gama": "original-72adc7dc3a6270.svg",
      Vitória: "original-a5f3cf1c18f917.svg",
      Internacional: "original-8d294eb556df7e.svg",
      "Athletico Paranaense": "original-f6ae2186c8050d.svg",
      Chapecoense: "original-f104b0fa29cb3b.svg",
      Coritiba: "original-fa1d5838ef24b1.svg",
      Remo: "original-f04e8efb46e2d7.svg",
      "River Plate": "original-99e2b58c8c58d8.svg",
      "Boca Juniors": "original-d6de3e17fe2d2a.svg",
      "Racing Club": "original-933a7380cb1109.svg",
      Independiente: "original-53946ba3c31279.svg",
      "San Lorenzo": "original-bac3176504a8fe.svg",
      "Estudiantes de La Plata": "original-be83f6d5677550.svg",
      "Vélez Sarsfield": "original-9b1d1f559116de.svg",
      "Rosario Central": "original-97d4e341ca6436.svg",
      "Newell’s Old Boys": "original-783f41c994d41a.svg",
      Talleres: "original-ebeeef29e0a49a.svg",
      Belgrano: "original-36ca70f4e5025c.svg",
      Lanús: "original-60eb30c4c4620d.svg",
      Huracán: "original-6eded4e498617d.svg",
      "Argentinos Juniors": "original-5d6f7db8fce02a.svg",
      "Defensa y Justicia": "original-ffa15aeed70cd0.svg",
      "Godoy Cruz": "original-86bdaad31a9d37.svg",
      "Unión de Santa Fe": "original-e986234b0943f4.svg",
      Tigre: "original-ca9e6517632557.svg",
      "Gimnasia La Plata": "original-71043d70252539.svg",
      Banfield: "original-9db2b735d93e83.svg",
      "Atlético Tucumán": "original-13129b09d0934a.svg",
      "Central Córdoba": "original-23196a2a84e36d.svg",
      Instituto: "original-2183027e204015.svg",
      "Independiente Rivadavia": "original-aeb53a7c9cde15.svg",
      "Deportivo Riestra": "original-62ba8e1464c13e.svg",
      "Barracas Central": "original-a4be5add023d49.svg",
      Platense: "original-76ad7747516ce6.svg",
      Sarmiento: "original-63cf1eb27691c9.svg",
      "San Martín de San Juan": "original-3a08cf3ef1f804.svg",
      Aldosivi: "original-4fc160adcf968c.svg",
      Arsenal: "original-15c6d611193988.svg",
      "Manchester City": "original-477a89c66f44ad.svg",
      Liverpool: "original-9e861941ad8bf5.svg",
      Chelsea: "original-1ecd41c03ef78b.svg",
      "Manchester United": "original-767fc64ce31d98.svg",
      "Tottenham Hotspur": "original-546b6448aad768.svg",
      "Newcastle United": "original-87fef07bf984ee.svg",
      "Aston Villa": "original-5ffc7dfc876eca.svg",
      "Brighton & Hove Albion": "original-d64baa9c22c9fa.svg",
      "Nottingham Forest": "original-b9a2c0c9e15b02.svg",
      "Crystal Palace": "original-d826a57fbaa86c.svg",
      Bournemouth: "original-c940429f4dcb49.svg",
      Brentford: "original-8617b1495b83c3.svg",
      Fulham: "original-79996373623b60.svg",
      "Coventry City": "original-17a65f2f9937c0.svg",
      Everton: "original-7c8159dd2e49a5.svg",
      "Hull City": "original-b4a8782df29c96.svg",
      "Leeds United": "original-8a713ff5ac700c.svg",
      "Ipswich Town": "original-5ac1ace0e4497d.svg",
      Sunderland: "original-f0990dc8a0f70f.svg",
      "Real Madrid": "original-8fc0293969dac5.svg",
      Barcelona: "original-e647708a520607.svg",
      "Atlético de Madrid": "original-fe9759b01435d4.svg",
      "Athletic Club": "original-ec4fd550587bd6.svg",
      Villarreal: "original-b4a53bd82f8c8d.svg",
      "Real Betis": "original-650a26c3640c8a.svg",
      "Celta de Vigo": "original-8f29a0c8dabfc0.svg",
      "Rayo Vallecano": "original-ec1569a31d2db0.svg",
      Osasuna: "original-ba9a54475412e7.svg",
      "Deportivo La Coruña": "original-4ab8dbacfc4dc5.svg",
      "Real Sociedad": "original-c93d96f7f07fbd.svg",
      Valencia: "original-626b208a365327.svg",
      Getafe: "original-af0cf99b839a6c.svg",
      Espanyol: "original-88609184c61624.svg",
      Alavés: "original-213a5031760024.svg",
      Málaga: "original-2e5d7cb7a53c51.svg",
      Sevilla: "original-a0152061d6a032.svg",
      Levante: "original-bae6729079741c.svg",
      Elche: "original-3ef249cab88399.svg",
      "Racing Santander": "original-113052d87118bd.svg",
      "Inter de Milão": "original-5f16a64934b51d.svg",
      Napoli: "original-008be6875298f5.svg",
      Milan: "original-efee614420c57d.svg",
      Juventus: "original-11148d8f6ad4d4.svg",
      Atalanta: "original-c48db3ce2b9eee.svg",
      Roma: "original-b0c27fca74fa91.svg",
      Lazio: "original-25e650426bbf0d.svg",
      Fiorentina: "original-2baf2836799bcf.svg",
      Bologna: "original-23b611dc72bae9.svg",
      Como: "original-ea3dc747f15400.svg",
      Torino: "original-e03644633d4bf6.svg",
      Udinese: "original-7cabadb8331090.svg",
      Genoa: "original-bbf9dee91d983f.svg",
      Frosinone: "original-5f80b32380c53a.svg",
      Cagliari: "original-f0de59487a87f0.svg",
      Lecce: "original-4ad81a18cd00d3.svg",
      Parma: "original-0bf974d86c72f1.svg",
      Sassuolo: "original-b70e859bdb691a.svg",
      Monza: "original-0b2d9f079cd12a.svg",
      Venezia: "original-d0fd88044fd502.svg",
      "Bayern de Munique": "original-0c5e15445f995b.svg",
      "Bayer Leverkusen": "original-76b6ab8321f6c7.svg",
      "Borussia Dortmund": "original-adf507fc027afe.svg",
      "Eintracht Frankfurt": "original-f335c5dc36f57d.svg",
      "RB Leipzig": "original-ae4a1b349a98b4.svg",
      Stuttgart: "original-9dc5bad7a55031.svg",
      Freiburg: "original-f00cb6c4922024.svg",
      "Mainz 05": "original-cf83e7771e6362.svg",
      "Werder Bremen": "original-c49cf0094c04b2.svg",
      "Borussia Mönchengladbach": "original-dadd47a65108df.svg",
      Elversberg: "original-6afb5e008b7f9e.svg",
      Augsburg: "original-3cc71f38946c2f.svg",
      "Union Berlin": "original-fe27ee87f62411.svg",
      Paderborn: "original-cbb3895904f679.svg",
      Hoffenheim: "original-5a49be55773f5b.svg",
      "Schalke 04": "original-d44f2bcf3464e5.svg",
      "Hamburger SV": "original-8b36588118b6f5.svg",
      Köln: "original-1c33ac6f1f97b3.svg",
      "Paris Saint-Germain": "original-68ef7f48796ade.svg",
      "Olympique de Marseille": "original-6b828aeb754061.svg",
      Monaco: "original-8870e6cbc01473.svg",
      Lille: "original-954fd15b13737d.svg",
      Lyon: "original-f56206ec0f42e0.svg",
      Nice: "original-e186022d0931af.svg",
      Strasbourg: "original-9086cdf9770bb6.svg",
      Lens: "original-812b9215cd2f0e.svg",
      Brest: "original-c1143705b37c3d.svg",
      Rennes: "original-170c4efbf64c7f.svg",
      Auxerre: "original-2ae8d797a6ecd7.svg",
      Toulouse: "original-5483d5df9b245e.svg",
      "Le Mans": "original-9f97b71bbbb848.svg",
      Angers: "original-0582f4223d9a3c.svg",
      "Le Havre": "original-1f4f01dd5ab726.svg",
      Lorient: "original-42b5ff547e7fbc.svg",
      "Paris FC": "original-9ce21eac3a5cb6.svg",
      Troyes: "original-a397c3e431ec77.svg",
      "Sporting CP": "original-47e26a1b78b95a.svg",
      Benfica: "original-f97557ce9b1cf0.svg",
      Porto: "original-01735c5ff16087.svg",
      Braga: "original-ef376b8f315b03.svg",
      "Vitória de Guimarães": "original-105198f08f096b.svg",
      "Santa Clara": "original-5d88a03e611899.svg",
      Famalicão: "original-64daa95b808018.svg",
      "Estoril Praia": "original-02cdd331feda2a.svg",
      "Casa Pia": "original-d9f7dd92c3edda.svg",
      Moreirense: "original-d6fb74f5bd283a.svg",
      "Rio Ave": "original-7e85b195803780.svg",
      Arouca: "original-a52cbb7f1af3e9.svg",
      "Gil Vicente": "original-b83de8521ec258.svg",
      "Nacional da Madeira": "original-306ae847a44bc0.svg",
      AVS: "original-774183b41e2c10.svg",
      Alverca: "original-1a12d59363af28.svg",
      Tondela: "original-eb3e0612b16d82.svg",
      "Estrela da Amadora": "original-e491ab1b9331bc.svg",
      PSV: "original-5f0d364b5a8e7a.svg",
      Ajax: "original-40cea1fd091baf.svg",
      Feyenoord: "original-108bd0766bf42a.svg",
      Utrecht: "original-1067936ba29c8a.svg",
      "AZ Alkmaar": "original-18cd53867bcbba.svg",
      Twente: "original-5b0e6767971373.svg",
      "Go Ahead Eagles": "original-b8f42a33d6c81f.svg",
      "NEC Nijmegen": "original-72028c69fe5859.svg",
      Heerenveen: "original-a62d13a1b5f0b7.svg",
      "PEC Zwolle": "original-23934147080990.svg",
      "Fortuna Sittard": "original-7cc269eaadbcc4.svg",
      "Sparta Rotterdam": "original-b4aeb7162f385b.svg",
      Groningen: "original-0eefcdd6e5d0a5.svg",
      "Heracles Almelo": "original-405ff137e5e411.svg",
      "NAC Breda": "original-9b6e27e377e036.svg",
      Excelsior: "original-50a7067d924c9c.svg",
      Volendam: "original-3cbdfd87da999f.svg",
      Telstar: "original-cd0351b5130abe.svg",
      "Atlético Nacional": "original-578e07faeeb3c4.svg",
      Millonarios: "original-b0bfc163036b51.svg",
      "América de Cali": "original-25277b0ab9dcd0.svg",
      "Independiente Medellín": "original-cecc9d1e1a2c04.svg",
      "Junior Barranquilla": "original-e2894ed4cfe366.svg",
      "Independiente Santa Fe": "original-242aaa92a02d7f.svg",
      "Deportes Tolima": "original-92dec88dbd585f.svg",
      "Once Caldas": "original-5005bcc5ccd788.svg",
      "Deportivo Cali": "original-0ed9c3e264df41.svg",
      "Deportivo Pereira": "original-1dbd7dfe35d468.svg",
      "Deportivo Pasto": "original-bac07b951db6e1.svg",
      "Atlético Bucaramanga": "original-8bb453ba636b71.svg",
      "La Equidad": "original-88eae1f2542c4e.svg",
      "Fortaleza CEIF": "original-f7f2ae38c04eb6.svg",
      "Águilas Doradas": "original-777a30046167fc.svg",
      "Alianza FC": "original-4e611a995fb9b8.svg",
      "Boyacá Chicó": "original-22eeb0bc430c1c.svg",
      Llaneros: "original-fc53333a2b0e82.svg",
      "Unión Magdalena": "original-91ae7ecf20a7ab.svg",
      "Colo-Colo": "original-545f91326c4e8b.svg",
      "Universidad de Chile": "original-7825b3a1a4f58b.svg",
      "Universidad Católica": "original-28eeff6c59ad54.svg",
      Palestino: "original-87b8efa10d8ecc.svg",
      "Coquimbo Unido": "original-950324b21dc5d0.svg",
      "Audax Italiano": "original-8ba44810bc725d.svg",
      "O’Higgins": "original-0a3a7da8f0efec.svg",
      Cobresal: "original-cf41e3028f10bb.svg",
      Huachipato: "original-c84ba7d16b33e5.svg",
      Ñublense: "original-a079a0da42a428.svg",
      "Unión La Calera": "original-5a15316fba78f4.svg",
      "Everton de Viña del Mar": "original-3aac28fd826770.svg",
      "Unión Española": "original-58df625253c9a7.svg",
      "Deportes Iquique": "original-61edad3fb27cf0.svg",
      "Deportes La Serena": "original-e3f3ea7cd0ae44.svg",
      "Deportes Limache": "original-9465e4584d6b48.svg",
      Peñarol: "original-5f110ca0212ab1.svg",
      Nacional: "original-886b904b012dd0.svg",
      "Liverpool Montevideo": "original-989468f5d9c435.svg",
      "Defensor Sporting": "original-d3bd49c5011ff6.svg",
      Danubio: "original-6d290cf8979c69.svg",
      "Boston River": "original-5288e20d45360e.svg",
      "Racing Montevideo": "original-4b826b02a59a8a.svg",
      "Montevideo Wanderers": "original-85a9aae459569d.svg",
      "Cerro Largo": "original-d4342f053abff4.svg",
      Cerro: "original-030f424ea0bb64.svg",
      Progreso: "original-b45fae26bcdd54.svg",
      "River Plate Montevideo": "original-308cf262347c9f.svg",
      "Miramar Misiones": "original-6b08b708fbed2e.svg",
      "Plaza Colonia": "original-a26915b4ef4993.svg",
      "Juventud de Las Piedras": "original-ff95170fc37105.svg",
      "Montevideo City Torque": "original-4e4ec7c99bc1b9.svg",
      "LDU Quito": "original-295e92b5d918d7.svg",
      "Independiente del Valle": "original-d16c591686d22b.svg",
      "Barcelona SC": "original-fe0bb719b1692a.svg",
      Emelec: "original-c7736aea27f345.svg",
      Aucas: "original-e911eeec727080.svg",
      "Universidad Católica del Ecuador": "original-c43044a6ef23a2.svg",
      "Deportivo Cuenca": "original-af52da8fdd1f6d.svg",
      "El Nacional": "original-bda11b42d148b3.svg",
      Delfín: "original-a73cf33ef680a2.svg",
      "Mushuc Runa": "original-ce7758352ca3ba.svg",
      "Técnico Universitario": "original-9e84dc2a8cde9f.svg",
      Macará: "original-917e53c1305a63.svg",
      Orense: "original-8f266a0a15f348.svg",
      "Libertad de Loja": "original-39d742c56ae8cc.svg",
      Manta: "original-54141373db1eee.svg",
      "Vinotinto del Ecuador": "original-7f3b9b0e0a765d.svg",
      Universitario: "original-cd5e264ed34422.svg",
      "Alianza Lima": "original-4265559e75e90f.svg",
      "Sporting Cristal": "original-aedd4473a5048c.svg",
      Melgar: "original-b92a0b4bfc4a66.svg",
      Cienciano: "original-c35f5328c6cd20.svg",
      "ADT de Tarma": "original-ced2b494918909.svg",
      "Cusco FC": "original-8500dd3916cfdd.svg",
      "Alianza Atlético": "original-a41bd2420ce218.svg",
      "Atlético Grau": "original-448146261188a4.svg",
      "Deportivo Garcilaso": "original-2049907ef04e94.svg",
      "Sport Huancayo": "original-bb1746bcf9261e.svg",
      "UTC Cajamarca": "original-7438b640fba921.svg",
      "Comerciantes Unidos": "original-61ad8f7fa19ae2.svg",
      "Los Chankas": "original-21f4f2974c5b99.svg",
      "Sport Boys": "original-fd2766fd407496.svg",
      "Alianza Universidad": "original-385f8f79371964.svg",
      "Ayacucho FC": "original-301b7dcffefc6b.svg",
      "Juan Pablo II College": "original-5ef1c9f20a5a71.svg",
      "Deportivo Binacional": "original-8cd270073b55a1.svg",
      Olimpia: "original-6f92f0167ad073.svg",
      "Cerro Porteño": "original-96681c1de46dca.svg",
      Libertad: "original-6e97caf1910c92.svg",
      Guaraní: "original-cb6b0140a169a6.svg",
      "Nacional de Asunción": "original-5dfcbdf7895956.svg",
      "Sportivo Luqueño": "original-dc512f92f0dccd.svg",
      "Sportivo Trinidense": "original-9f190d0d641acf.svg",
      "Sportivo Ameliano": "original-eef90325620a7d.svg",
      "2 de Mayo": "original-f66336cb6323bd.svg",
      "Deportivo Recoleta": "original-af0f0108f0bcd6.svg",
      "Atlético Tembetary": "original-cf1301e0bafc39.svg",
      Bolívar: "original-5932b1a8b1d0dd.svg",
      "Always Ready": "original-b4895b93392d68.svg",
      "The Strongest": "original-acc2cab42640dd.svg",
      Blooming: "original-259431f28f16a7.svg",
      "Oriente Petrolero": "original-9b650274a60e6f.svg",
      "San Antonio Bulo Bulo": "original-471d553d58d2f1.svg",
      "Nacional Potosí": "original-82d31938a5088e.svg",
      "Real Tomayapo": "original-9d5bb828b837fe.svg",
      "Independiente Petrolero": "original-4bee8a0051fdd2.svg",
      Aurora: "original-9b89025ce7a6d9.svg",
      "Universitario de Vinto": "original-08537182ea85e9.svg",
      "GV San José": "original-7fb5b505920a4b.svg",
      ABB: "original-715edf8ba87294.svg",
      "CDT Real Oruro": "original-cbf2f43a43856d.svg",
      Guabirá: "original-e790738858b370.svg",
      "Jorge Wilstermann": "original-4b25105c7d86fa.svg",
      "Deportivo Táchira": "original-742df99fe0bc39.svg",
      "Caracas FC": "original-4cd8e7a58a4ff9.svg",
      "Deportivo La Guaira": "original-a8195c452ddb70.svg",
      "Universidad Central de Venezuela": "original-828ab0d90425b0.svg",
      Carabobo: "original-b536a2876f25bd.svg",
      "Academia Puerto Cabello": "original-7619d687372e05.svg",
      Metropolitanos: "original-5ee3fdf4b47bd5.svg",
      Monagas: "original-9e351dcbee1983.svg",
      Portuguesa: "original-233c761b095305.svg",
      Zamora: "original-bed942d84bc947.svg",
      "Estudiantes de Mérida": "original-628d5f40c0b324.svg",
      "Rayo Zuliano": "original-5e487a6a362c28.svg",
      Anzoátegui: "original-11dc72589ed82d.svg",
      "Inter Miami": "original-4794ab21564d35.svg",
      "LA Galaxy": "original-ddece691bb2c6b.svg",
      "Los Angeles FC": "original-a34b40d010af11.svg",
      "Atlanta United": "original-2ced3e41fa1815.svg",
      "Austin FC": "original-f96897f277953f.svg",
      "Charlotte FC": "original-28acfad0ff8203.svg",
      "Chicago Fire": "original-ed188318358e1a.svg",
      "FC Cincinnati": "original-11ef08e9306614.svg",
      "Colorado Rapids": "original-a78ac513b8d641.svg",
      "Columbus Crew": "original-62f8b67236e1b5.svg",
      "FC Dallas": "original-e5b204cfb8167d.svg",
      "D.C. United": "original-309cf6f8eda4f3.svg",
      "Houston Dynamo": "original-32a77484e0d82d.svg",
      "Sporting Kansas City": "original-a985759c9db4b2.svg",
      "Minnesota United": "original-be1807d21a1102.svg",
      "CF Montréal": "original-eb0d298cd8140f.svg",
      "Nashville SC": "original-5750bae2d7818f.svg",
      "New England Revolution": "original-231b1156c6445c.svg",
      "New York City FC": "original-a95d0ac8c57fe4.svg",
      "New York Red Bulls": "original-37895dfa26402a.svg",
      "Orlando City": "original-c4a4e1d8f2f61f.svg",
      "Philadelphia Union": "original-3e3615ec3811a2.svg",
      "Portland Timbers": "original-5e9d7a1fde38be.svg",
      "Real Salt Lake": "original-5ecfb8df4af87f.svg",
      "San Diego FC": "original-278966f8b4c560.svg",
      "San Jose Earthquakes": "original-df79d58cda49d3.svg",
      "Seattle Sounders": "original-f797eaa92ec389.svg",
      "St. Louis City": "original-536b8ff293feaa.svg",
      "Toronto FC": "original-04b8abb199ba87.svg",
      "Vancouver Whitecaps": "original-7df8a68cb2d987.svg",
      "Club América": "original-9a58c3f2e6b99b.svg",
      Guadalajara: "original-c00fb0b23bf3d1.svg",
      "Cruz Azul": "original-760791825f1335.svg",
      "Pumas UNAM": "original-0350634061ab3c.svg",
      "Tigres UANL": "original-2ab4a454502b41.svg",
      Monterrey: "original-cd2206729d2b8d.svg",
      Toluca: "original-89f1921a62c69b.svg",
      Pachuca: "original-8d4c4ec664410f.svg",
      León: "original-1534cf2af76ecd.svg",
      "Santos Laguna": "original-384658cd94a64f.svg",
      Atlas: "original-7c82602500857a.svg",
      Necaxa: "original-342f43aedf7be2.svg",
      Puebla: "original-752eea38ab97fd.svg",
      Querétaro: "original-669dc1db6dc80b.svg",
      Tijuana: "original-c6980a21481dad.svg",
      "Atlético San Luis": "original-9b70e5225ecc3e.svg",
      Juárez: "original-dd064116b0bbd1.svg",
      Mazatlán: "original-bdc441631b8a37.svg",
      "Al-Hilal": "original-8e7bfd10ebcb05.svg",
      "Al-Nassr": "original-3f4634466a9ac3.svg",
      "Al-Ittihad": "original-ffa2084d0ce399.svg",
      "Al-Ahli": "original-1c4c961ee71813.svg",
      "Al-Shabab": "original-0921c87786172e.svg",
      "Al-Qadsiah": "original-0637e04572f640.svg",
      "Al-Ettifaq": "original-7afcaccd304efd.svg",
      "Al-Taawoun": "original-02f7162d60bf12.svg",
      "Al-Fateh": "original-bb9d03c00eb898.svg",
      "Al-Fayha": "original-0385d89114211d.svg",
      "Al-Khaleej": "original-1627a9f7b693c9.svg",
      Damac: "original-8b651d9ed6ca98.svg",
      "Al-Riyadh": "original-7cb4e2a1388dad.svg",
      "Al-Okhdood": "original-07550f0af9ffd4.svg",
      "Al-Kholood": "original-7a31c276744b66.svg",
      NEOM: "original-1666a289fa9875.svg",
      "Al-Najma": "original-0017739db94fdc.svg",
      "Al-Hazem": "original-43385e411ef944.svg",
      "Kashima Antlers": "original-080c74cad0233f.svg",
      "Kashiwa Reysol": "original-b5239761f0075b.svg",
      "Kyoto Sanga": "original-e80f7ad27a676e.svg",
      "Sanfrecce Hiroshima": "original-d6c1efec22846c.svg",
      "Vissel Kobe": "original-cfe27adc8f53d8.svg",
      "Machida Zelvia": "original-4fc60038a6190a.svg",
      "Urawa Red Diamonds": "original-a4ca2054508518.svg",
      "Kawasaki Frontale": "original-0af6c3986da78b.svg",
      "Gamba Osaka": "original-667160bb7dcafc.svg",
      "Cerezo Osaka": "original-c1e0c2e88f5d68.svg",
      "FC Tokyo": "original-e0ef629c5209fd.svg",
      "Fagiano Okayama": "original-bdc5ce96d0bfd0.svg",
      "Yokohama F. Marinos": "original-b2c3a52b284f6f.svg",
      "Nagoya Grampus": "original-34647d8798a88d.svg",
      "Albirex Niigata": "original-4e573a4a9c5b53.svg",
      "Shimizu S-Pulse": "original-739ceba7b07393.svg",
      "Tokyo Verdy": "original-d1f92f0593ca35.svg",
      "Avispa Fukuoka": "original-0eb286e8cb40c0.svg",
      "Shonan Bellmare": "original-126f214023a030.svg",
      "Yokohama FC": "original-e879004e0f9892.svg",
      Ceará: "original-70528be54163fe.svg",
      Fortaleza: "original-d5136e93e64c91.svg",
      Juventude: "original-e0591aac025500.svg",
      Sport: "original-ec450786e26a51.svg",
      "West Ham United": "original-4bae064671250a.svg",
      "Wolverhampton Wanderers": "original-6fef4472df5521.svg",
      Burnley: "original-099dd595ce6576.svg",
      Mallorca: "original-80d4f92371f0c2.svg",
      Girona: "original-27052dea936da6.svg",
      "Real Oviedo": "original-132b44a3745a94.svg",
      "Hellas Verona": "original-cd1a80dd2052f2.svg",
      Pisa: "original-2727b4974efc6e.svg",
      Cremonese: "original-3b76c8e0266c4c.svg",
      Wolfsburg: "original-e68b2c7b607a76.svg",
      "St. Pauli": "original-a7181364574015.svg",
      Heidenheim: "original-abd20b0f073652.svg",
      Nantes: "original-864023960423af.svg",
      Metz: "original-1382dca91398a1.svg",
      Envigado: "original-55a2411c28949c.svg",
      "General Caballero JLM": "original-76c88b0a737261.svg",
      Yaracuyanos: "original-8b4c41d26912eb.svg",
    },
    countries: {
      Brazil: "flag-br.png",
      Argentina: "flag-ar.png",
      Uruguay: "flag-uy.png",
      Colombia: "flag-co.png",
      Chile: "flag-cl.png",
      Ecuador: "flag-ec.png",
      Peru: "flag-pe.png",
      Paraguay: "flag-py.png",
      Bolivia: "flag-bo.png",
      Venezuela: "flag-ve.png",
      England: "flag-gb-eng.png",
      Spain: "flag-es.png",
      Italy: "flag-it.png",
      Germany: "flag-de.png",
      France: "flag-fr.png",
      Portugal: "flag-pt.png",
      Netherlands: "flag-nl.png",
      Belgium: "flag-be.png",
      Croatia: "flag-hr.png",
      Denmark: "flag-dk.png",
      Switzerland: "flag-ch.png",
      Sweden: "flag-se.png",
      Norway: "flag-no.png",
      Poland: "flag-pl.png",
      Serbia: "flag-rs.png",
      Scotland: "flag-gb-sct.png",
      Wales: "flag-gb-wls.png",
      Türkiye: "flag-tr.png",
      Ukraine: "flag-ua.png",
      Austria: "flag-at.png",
      Greece: "flag-gr.png",
      Ireland: "flag-ie.png",
      "Czech Republic": "flag-cz.png",
      "United States": "flag-us.png",
      Canada: "flag-ca.png",
      Mexico: "flag-mx.png",
      "Costa Rica": "flag-cr.png",
      Jamaica: "flag-jm.png",
      Japan: "flag-jp.png",
      "South Korea": "flag-kr.png",
      "Saudi Arabia": "flag-sa.png",
      Australia: "flag-au.png",
      Iran: "flag-ir.png",
      Morocco: "flag-ma.png",
      Senegal: "flag-sn.png",
      Nigeria: "flag-ng.png",
      Ghana: "flag-gh.png",
      Algeria: "flag-dz.png",
      Cameroon: "flag-cm.png",
      "Cote d'Ivoire": "flag-ci.png",
      Egypt: "flag-eg.png",
      "South Africa": "flag-za.png",
      "New Zealand": "flag-nz.png",
    },
  };
  root.LegacyBadgeData = data;
  if (typeof module !== "undefined") module.exports = data;
})(globalThis);
