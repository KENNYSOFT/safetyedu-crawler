#!/bin/node

import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import { pipeline } from "stream/promises";
import { openSync, writeSync, existsSync, mkdirSync, writeFileSync, createWriteStream, closeSync } from "fs";

const LECTURES = [
    { title: "안전심리의 이해", path: "16ECFEEF5DEVLHFECPTX/27" },
    { title: "안전문화의 특성 및 개선방안", path: "16ECFEEF5DEVQERURONJ/33" },
    { title: "사업장 내 안전 커뮤니케이션", path: "16ECFEEF5DEDBPDEJRUT/14" },
    { title: "사무실 근로자를 위한 작업환경 및 건강관리", path: "16ECFEEF5E0MRDOFIEKO/166" },
    { title: "일하는 사람의 보건관리", path: "16ECFEEF5DDBEVIHKWSK/08" },
    { title: "근골격계 질환의 이해", path: "16ED47C10F6KMZEUFYJR/162" },
    { title: "직무스트레스에 의한 건강장해 예방", path: "16E8D1B6B01INOTOMFOT/169" },
    { title: "재해종류별 응급처치요령", path: "16EAB2905DDUZTDBRNCM/174" },
    { title: "밀폐공간 작업 시 안전조치", path: "16ECFEEF5E0UHGQPCIRX/159" },
    { title: "영상표시단말기(VDT) 작업에 따른 질병예방 방안", path: "1761BEB777BBRHALGUBC/324" },
];

const processFile = async (lecture, mediaUrl, batch, type, file) => {
    switch (type) {
        case "mp4":
            if (file) {
                batch.push(
                    `ffmpeg -n -i "${mediaUrl.element.info.mp4Url_2}_definst_/mp4:${mediaUrl.element.info.mp4Sub_2}${file}/playlist.m3u8" -c copy "${file}"`
                );
            }
            break;
        case "mp3":
            batch.push(
                `curl -O "http://www.safetyedu.net/econtents/Content/NEW_CONTENTS/${lecture.path}/common/mp3/${file}"`
            );
            break;
    }
};

const main = async () => {
    if (!existsSync("data")) {
        mkdirSync("data");
    }
    const globalBatch = openSync("data/run.bat", "w");
    writeSync(globalBatch, "CHCP 65001\r\n");

    for (const [i, lecture] of LECTURES.entries()) {
        const title = `${i + 1}. ${lecture.title}`;
        if (!existsSync(`data/${title}`)) {
            mkdirSync(`data/${title}`);
        }
        console.log(title);

        const res = await fetch(
            `http://www.safetyedu.net/econtents/Content/NEW_CONTENTS/${lecture.path}/common/config/media_url.xml`
        );
        const xml = await res.text();
        const mediaUrl = new XMLParser({ ignoreAttributes: false }).parse(xml);

        writeFileSync(`data/${title}/media_url.xml`, xml);

        const caption = await fetch(
            `http://www.safetyedu.net/econtents/Content/NEW_CONTENTS/${lecture.path}/xml/caption.xml`
        );
        await pipeline(caption.body, createWriteStream(`data/${title}/caption.xml`));

        const batch = [];

        for (const link of mediaUrl.element.nav.meialLink) {
            processFile(lecture, mediaUrl, batch, link["@_type"], link["@_file"]);
            processFile(lecture, mediaUrl, batch, link["@_subType"], link["@_subFile"]);
        }

        writeFileSync(`data/${title}/run.bat`, batch.join("\r\n"));

        writeSync(globalBatch, `PUSHD "${title}"\r\n`);
        writeSync(globalBatch, `CALL run.bat\r\n`);
        writeSync(globalBatch, `DEL run.bat\r\n`);
        writeSync(globalBatch, `POPD\r\n`);
        console.log();
    }

    closeSync(globalBatch);
};

main().then(() => {
    process.exit(0);
});
