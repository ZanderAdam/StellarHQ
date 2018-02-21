define([
    'stellar-sdk',
    'util',
    'knockout',
    'viewModels/transactionViewModel',
    'viewModels/qrScanViewModel'
  ],
  function (
    StellarSdk,
    util,
    ko,
    TransactionViewModel,
    QrScanViewModel) {

    function AccountViewModel(server) {
      var self = this;
      var server = server;

      this.publicKey = ko.observable("");
      this.secretKey = ko.observable("")

      this.account = ko.observable(null);
      this.accountData = ko.observable(null);
      this.transaction = ko.observable(null);
      this.accountTab = ko.observable("details");
      this.showScanQr = ko.observable(false);
      this.qrScanner = ko.observable();

      if (!util.isOnline())
        this.accountTab = ko.observable("transactions");

      this.connect = function () {
        if (!util.isOnline())
          return Promise.resolve();

        return server.loadAccount(this.publicKey())
          .then(function (account) {
            console.log('Account Loaded');

            account.incrementSequenceNumber();
            self.account(account);
            self.getAccountData(account);

            return account;
          })
          .catch(function (e) {
            console.error(e);
          });
      }

      this.newTransaction = function () {
        this.connect()
          .then(function (account) {
            self.transaction(new TransactionViewModel(self.publicKey(),
              account ? account.sequenceNumber() : null, server));
          });
      }

      this.importTransaction = function (data, e) {
        var file = e.target.files[0];

        if (!file)
          return;

        util.uploadFile(file)
          .then(function (result) {
            self.loadFromJson(result);
          });
      };

      this.scanQr = function () {
        if (!this.qrScanner())
          this.qrScanner(new QrScanViewModel());

        self.showScanQr(true);

        this.qrPromise = this.qrScanner().scan();

        this.qrPromise.promise
          .then(function (result) {
            self.showScanQr(false);
            self.loadFromJson(result);
          })
      }

      this.cancelQrScan = function () {
        this.qrPromise.cancel();
        self.showScanQr(false);
      }

      this.getAccountData = function (account) {
        var data = account.data_attr;

        Object.keys(data).forEach(function (key) {
          var encodedValue = data[key];
          var decodedValue = util.b64DecodeUnicode(encodedValue)

          data[key] = decodedValue;
        });

        var data = util.unflatten(data);

        self.accountData(JSON.stringify(data, null, '  '));
      }

      this.loadFromJson = function (data) {
        var parsedTran = JSON.parse(data);
        self.publicKey(parsedTran.pK);

        var newTransaction = new TransactionViewModel(self.publicKey(), null, server);
        newTransaction.loadTransaction(parsedTran);

        self.transaction(newTransaction);
      }
    }

    return AccountViewModel;
  });