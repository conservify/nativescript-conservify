const Observable = require("tns-core-modules/data/observable").Observable;
const Conservify = require("nativescript-conservify").Conservify;

const { Folder, path, File, knownFolders } = require("tns-core-modules/file-system");

function getMessage(counter) {
    if (counter <= 0) {
        return "Hoorraaay! You unlocked the NativeScript clicker achievement!";
    } else {
        return `${counter} taps left`;
    }
}

class DiscoveryEvents {
    onFoundService(info) {
        console.log("onServiceFound", info);
    }

    onLostService(info) {
        console.log("onServiceLost", info);
    }
}

function createViewModel() {
    const viewModel = new Observable();
    viewModel.counter = 42;
    viewModel.message = getMessage(viewModel.counter);

    viewModel.onTap = () => {
        viewModel.counter--;
        viewModel.set("message", getMessage(viewModel.counter));
    };

    const conservify = new Conservify(new DiscoveryEvents());

    const where = knownFolders
        .documents()
        .getFolder("fk")
        .getFile("test.bin");

    console.log("where", where.path);

    console.log("conservify", conservify);

    conservify
        .start("_fk._tcp")
        .then(() => {
            console.log("fileSystem", conservify.fileSystem, "opening file");
            return conservify
                .open("missing-file.fkpb")
                .then(file => {
                    console.log("opened", file);
                    return file.info().then(
                        info => {
                            console.log("info", info);
                        },
                        err => {
                            console.log("error getting info", err);
                        }
                    );
                })
                .then(() => {
                    return conservify.writeSampleData().then(file => {
                        console.log("file", file);

                        console.log("file.path", file.path);

                        return conservify.open(file).then(
                            file => {
                                console.log("opened", file);
                                return file
                                    .info()
                                    .then(
                                        info => {
                                            console.log("info", info);
                                        },
                                        err => {
                                            console.log("error getting info", err);
                                        }
                                    )
                                    .then(() => {
                                        return file
                                            .records((position, size, records) => {
                                                console.log("records", position, size, records);
                                            })
                                            .then(() => {
                                                console.log("done reading");
                                            });
                                    })
                                    .then(() => {
                                        return file
                                            .delimited((position, size, records) => {
                                                console.log("records", position, size, records);
                                            })
                                            .then(() => {
                                                console.log("done reading");
                                            });
                                    });
                            },
                            () => {
                                console.log("ERROR");
                            }
                        );
                    });
                });
        })
        .then(() => {
            console.log("started, getting json");

            return conservify.json({
                url: "https://ifconfig.me/all.json",
            });
        })
        .then(data => {
            console.log("json", data);
        })
        .then(() => {
            console.log("downloading...");
            return conservify.download({
                url: "http://192.168.0.100:6060/fk-bundled-fkb.bin",
                path: where.path,
                progress: (total, copied, info) => {
                    console.log("download progress", info.url, total, copied);
                },
            });
        })
        .then(() => {
            const f = knownFolders
                .documents()
                .getFolder("fk")
                .getFile("test.bin");
            console.log("downloaded", f.path, f.size, "uploading...");
            return conservify.upload({
                url: "http://192.168.0.100:6060/upload",
                path: f.path,
                progress: (total, copied, info) => {
                    console.log("upload progress", info.url, total, copied);
                },
            });
        })
        .then(uploaded => {
            console.log("uploaded", uploaded);
            console.log("protobuf...");
            return conservify
                .protobuf({
                    url: "http://192.168.0.100:2380/fk/v1",
                    body: null,
                })
                .then(data => {
                    if (data.body) {
                        console.log("protobuf", data.body.length);
                    } else {
                        console.log("protobuf", "no body");
                    }
                });
        })
        .then(() => {
            console.log("findConnectedNetwork");
            return conservify.findConnectedNetwork();
        })
        .then(connected => {
            if (connected) {
                console.log("connected", connected.getSsid());
            } else {
                console.log("no connected network");
            }
        })
        .then(() => {
            console.log("scanning");
            return conservify.scanNetworks();
        })
        .then(networks => {
            console.log("networks", networks);
        })
        .then(() => {
            console.log("DONE");
            return {};
        })
        .catch(err => {
            console.log("Error", err);
        });

    return viewModel;
}

exports.createViewModel = createViewModel;
