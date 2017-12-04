const {expect} = require('chai')
const HotokenReservation = artifacts.require('./HotokenReservation')

contract('HotokenReservation', function(accounts) {

  it('should be able to deployed', async function() {
    const instance = await HotokenReservation.deployed()
    expect(instance).to.be.ok
  })

  it('should create empty whitelist', async function() {
    const instance = await HotokenReservation.deployed()
    expect(instance.whitelist).to.be.ok
  })

  it('should be able to add new adress to whitelist', async function() {
    const newAccount = accounts[1]
    const instance = await HotokenReservation.deployed()
    const result = await instance.addToWhitelist(newAccount)
    expect(result).to.be.ok
    expect(result).to.be.not.empty
    expect(Object.keys(result)).to.have.lengthOf(3)
    expect(result.receipt.status).to.be.equal(1)
  })

  it('should be able check address in the whitelist', async function() {
    const account = accounts[1]
    const instance = await HotokenReservation.deployed()
    const exists = await instance.whitelist.call(account)
    expect(exists.toNumber()).to.equal(1)
  })

  it('should be able check address in the whitelist via external method', async function() {
    const account = accounts[1]
    const instance = await HotokenReservation.deployed()
    const exists = await instance.existsInWhitelist(account, {from: account})
    expect(exists.toNumber()).to.equal(1)
  })

  it('should be able to add many new addresses to the whitelist', async function() {
    const newAccounts = [accounts[2], accounts[3], accounts[4]]
    const instance = await HotokenReservation.deployed()
    const result = await instance.addManyToWhitelist(newAccounts)
    expect(result).to.be.ok
    expect(result).to.be.not.empty
    expect(Object.keys(result)).to.have.lengthOf(3)
    expect(result.receipt.status).to.be.equal(1)
    expect((await instance.whitelist.call(newAccounts[0])).toNumber()).to.be.equal(1)
    expect((await instance.whitelist.call(newAccounts[1])).toNumber()).to.be.equal(1)
    expect((await instance.whitelist.call(newAccounts[2])).toNumber()).to.be.equal(1)
  })

  it('should be able to remove address from whitelist', async function() {
    const account = accounts[1]
    const instance = await HotokenReservation.deployed()
    await instance.removeFromWhiteList(account)
    const exists = await instance.whitelist.call(account)
    expect(exists.toNumber()).to.equal(0)
  })

  it('should be able to remove many addresses from whitelist', async function() {
    const listOfAccounts = [accounts[2], accounts[3], accounts[4]]
    const instance = await HotokenReservation.deployed()
    await instance.removeManyFromWhitelist(accounts)
    expect((await instance.whitelist.call(listOfAccounts[0])).toNumber()).to.be.equal(0)
    expect((await instance.whitelist.call(listOfAccounts[1])).toNumber()).to.be.equal(0)
    expect((await instance.whitelist.call(listOfAccounts[2])).toNumber()).to.be.equal(0)
  })

  it('should not be able to add address to whitelist if caller is not the owner', async function() {
    const newAccount = accounts[1]
    const instance = await HotokenReservation.deployed()
    try {
      await instance.addToWhitelist(newAccount, {from: accounts[2]})
    } catch (e) {
      expect(e.toString()).to.be.include('revert')
    }
  })

  it('should not be able to add many addresses to whitelist if caller is not the owner', async function() {
    const newAccounts = [accounts[2], accounts[3], accounts[4]]
    const instance = await HotokenReservation.deployed()
    try {
      await instance.addManyToWhitelist(newAccounts, {from: accounts[2]})
    } catch (e) {
      expect(e.toString()).to.be.include('revert')
    }
  })

  it('should not be able to remove address to whitelist if caller is not the owner', async function() {
    const account = accounts[1]
    const instance = await HotokenReservation.deployed()
    try {
      await instance.removeFromWhiteList(account, {from: accounts[2]})
    } catch (e) {
      expect(e.toString()).to.be.include('revert')
    }
  })

  it('should not be able to remove many addresses to whitelist if caller is not the owner', async function() {
    const listOfAccounts = [accounts[2], accounts[3], accounts[4]]
    const instance = await HotokenReservation.deployed()
    try {
      await instance.removeManyFromWhitelist(accounts, {from: accounts[2]})
    } catch (e) {
      expect(e.toString()).to.be.include('revert')
    }
  })
})

contract('HotokenReservation buy token', function(accounts) {

  it('should be able to retrieve ether for contributor that is in the whitelist', async function() {
    const instance = await HotokenReservation.deployed()
    const HTKN_PER_ETH = (await instance.HTKN_PER_ETH.call()).toNumber()
    const discountRate = (await instance.getDiscountRate()).toNumber()
    const usdRate = (await instance.getUSDRate("ETH")).toNumber()
    const owner = accounts[0]
    const user1 = accounts[1]

    // add to whitelist first
    await instance.addToWhitelist(user1)
    expect((await instance.existsInWhitelist(user1)).toNumber()).to.be.equal(1)

    // set mininum purchase from 50k to 10k
    await instance.setMinimumPurchase(10000)

    const amountEther = 40
    const amountWei = web3.toWei(amountEther, 'ether')

    const ownerEtherBefore = (await web3.eth.getBalance(owner)).toNumber()
    const tokenSoldBefore = (await instance.getTokenSold()).toNumber()

    await instance.sendTransaction({from: user1, value: amountWei})
    const user1BalanceAfter = (await instance.balanceOf(user1)).toNumber()
    const ownerEtherAfter = (await web3.eth.getBalance(owner)).toNumber()
    const tokenSoldAfter = (await instance.getTokenSold()).toNumber()

    expect(user1BalanceAfter).to.be.equal(HTKN_PER_ETH * (100 + discountRate) / 100 * usdRate * amountWei)
    expect(ownerEtherAfter).to.be.above(ownerEtherBefore)
    expect(tokenSoldAfter).to.be.equal(Number(tokenSoldBefore + (discountRate + 100) / 100 * HTKN_PER_ETH * usdRate * amountWei))
  })

  it('should be able to retrieve ether for contributor that already exists in ledger even if amount is less than minimum purchase', async function() {
    const instance = await HotokenReservation.deployed()
    const HTKN_PER_ETH = (await instance.HTKN_PER_ETH.call()).toNumber()
    const discountRate = (await instance.getDiscountRate()).toNumber()
    const usdRate = (await instance.getUSDRate("ETH")).toNumber()
    const owner = accounts[0]
    const user1 = accounts[1]

    // set mininum purchase from 50k to 10k
    await instance.setMinimumPurchase(10000)

    const amountEther = 1
    const amountWei = web3.toWei(amountEther, 'ether')

    const ownerEtherBefore = (await web3.eth.getBalance(owner)).toNumber()
    const tokenSoldBefore = (await instance.getTokenSold()).toNumber()
    const user1BalanceBefore = (await instance.balanceOf(user1)).toNumber()

    await instance.sendTransaction({from: user1, value: amountWei})
    const user1BalanceAfter = (await instance.balanceOf(user1)).toNumber()
    const ownerEtherAfter = (await web3.eth.getBalance(owner)).toNumber()
    const tokenSoldAfter = (await instance.getTokenSold()).toNumber()

    expect(user1BalanceAfter).to.be.equal(user1BalanceBefore + HTKN_PER_ETH * (100 + discountRate) / 100 * usdRate * amountWei)
    expect(ownerEtherAfter).to.be.above(ownerEtherBefore)
    expect(tokenSoldAfter).to.be.equal(Number(tokenSoldBefore + (discountRate + 100) / 100 * HTKN_PER_ETH * usdRate * amountWei))
  })

  it('should be able to sell token more than supply', async function() {
    const instance = await HotokenReservation.deployed()
    const HTKN_PER_ETH = (await instance.HTKN_PER_ETH.call()).toNumber()
    const discountRate = (await instance.getDiscountRate()).toNumber()
    const usdRate = (await instance.getUSDRate("ETH")).toNumber()
    const owner = accounts[0]
    const user1 = accounts[1]

    // set USD Rate
    await instance.setUSDRate("ETH", 500000000)

    const amountEther = 40
    const amountWei = web3.toWei(amountEther, 'ether')

    const tokenSoldBefore = (await instance.getTokenSold()).toNumber()
    const user1BalanceBefore = (await instance.balanceOf(user1)).toNumber()

    try {
      await instance.sendTransaction({from: user1, value: amountWei})
    } catch (e) {
      expect(e.toString()).to.be.include('revert')
    }
    
    const user1BalanceAfter = (await instance.balanceOf(user1)).toNumber()
    const tokenSoldAfter = (await instance.getTokenSold()).toNumber()

    expect(tokenSoldAfter).to.be.equal(tokenSoldBefore)
    expect(user1BalanceAfter).to.be.equal(user1BalanceBefore)
  })

  it('should not be able to retrieve ether from address that it is not in the whitelist', async function() {
    const instance = await HotokenReservation.deployed()

    const user2 = accounts[2]
    expect((await instance.existsInWhitelist(user2)).toNumber()).to.be.equal(0)

    const amountEther = 2
    const amountWei = web3.toWei(amountEther, 'ether')
    const tokenSoldBefore = (await instance.getTokenSold()).toNumber()

    try {
      await instance.sendTransaction({from: user2, value: amountWei})
    } catch (e) {
      expect(e.toString()).to.be.include('revert')
    }

    const tokenSoldAfter = (await instance.getTokenSold()).toNumber()
    expect(tokenSoldAfter).to.be.equal(tokenSoldBefore)
  })

  it('should not be able to retrieve ether from owner contract address', async function() {
    const instance = await HotokenReservation.deployed()
    const owner = accounts[0]

    const amountEther = 2
    const amountWei = web3.toWei(amountEther, 'ether')

    const ownerEtherBefore = (await web3.eth.getBalance(owner)).toNumber()
    const tokenSoldBefore = (await instance.getTokenSold()).toNumber()

    try {
      await instance.sendTransaction({from: owner, value: amountWei})
    } catch (e) {
      expect(e.toString()).to.be.include('revert')
    }
    const tokenSoldAfter = (await instance.getTokenSold()).toNumber()
    expect(tokenSoldAfter).to.be.equal(tokenSoldBefore)
  })

  it('should be able to log event if send ether success', async function() {
    const instance = await HotokenReservation.deployed()
    const HTKN_PER_ETH = (await instance.HTKN_PER_ETH.call()).toNumber()
    const discountRate = (await instance.getDiscountRate()).toNumber()

    /// set USD Rate
    await instance.setUSDRate("ETH", 400)

    const usdRate = (await instance.getUSDRate("ETH")).toNumber()
    const owner = accounts[0]
    const user2 = accounts[2]

    // add to whitelist first
    await instance.addToWhitelist(user2)
    expect((await instance.existsInWhitelist(user2)).toNumber()).to.be.equal(1)

    const amountEther = 40
    const amountWei = web3.toWei(amountEther, 'ether')

    const ownerEtherBefore = (await web3.eth.getBalance(owner)).toNumber()
    const tokenSoldBefore = (await instance.getTokenSold()).toNumber()

    const tx = await instance.sendTransaction({from: user2, value: amountWei})

    // check events log
    expect(tx.logs).to.be.ok
    expect(tx.logs[0].event).to.be.equal('TokenPurchase')
    expect(tx.logs[0].args.purchaser).to.be.equal(user2)
    expect(tx.logs[0].args.beneficiary).to.be.equal(user2)
    expect(tx.logs[0].args.value.toNumber()).to.be.equal(Number(amountWei))
    expect(tx.logs[0].args.amount.toNumber()).to.be.equal(HTKN_PER_ETH * (100 + discountRate) / 100 * usdRate * amountWei)
  })
})

contract('HotokenReservation set discount rate', function(accounts) {
  
  it('initial discount rate should be zero discount rate', async function() {
    const instance = await HotokenReservation.deployed()
    const discountRate = (await instance.getDiscountRate()).toNumber()
    expect(discountRate).to.be.equal(0)
  })

  it('should be able to set discount by contract owner', async function() {
    const instance = await HotokenReservation.deployed()
    await instance.setDiscountRate(3)
    const discountRate = (await instance.getDiscountRate()).toNumber()
    expect(discountRate).to.be.equal(30)
  })

  it('should not be able to set discount that more than 30%', async function() {
    const instance = await HotokenReservation.deployed()
    try {
      await instance.setDiscountRate(4)
    } catch (e) {
      expect(e.toString()).to.be.include('revert')
    }
    const discountRate = (await instance.getDiscountRate()).toNumber()
    // should be the same as above that we set to 30%
    expect(discountRate).to.be.equal(30)
  })

  it('should not be able to set discount if not call by contract owner', async function() {
    const instance = await HotokenReservation.deployed()
    const user1 = accounts[1]
    try {
      await instance.setDiscountRate(2, {from: user1})
    } catch (e) {
      expect(e.toString()).to.be.include('revert')
    }
  })
})

contract('HotokenReservation set usd rate', function(accounts) {
  
  it('should have initial value for usd rate map', async function() {
    const instance = await HotokenReservation.deployed()

    const ETHRate = (await instance.getUSDRate("ETH")).toNumber()
    const BTCRate = (await instance.getUSDRate("BTC")).toNumber()
    const USDRate = (await instance.getUSDRate("USD")).toNumber()

    expect(ETHRate).to.be.equal(400)
    expect(BTCRate).to.be.equal(11000)
    expect(USDRate).to.be.equal(1)
  })

  it('should be able to set usd rate for any currency', async function() {
    const instance = await HotokenReservation.deployed()
    await instance.setUSDRate("ETH", 500)
    await instance.setUSDRate("BTC", 12000)
    await instance.setUSDRate("USD", 12)

    const ETHRate = (await instance.getUSDRate("ETH")).toNumber()
    const BTCRate = (await instance.getUSDRate("BTC")).toNumber()
    const USDRate = (await instance.getUSDRate("USD")).toNumber()

    expect(ETHRate).to.be.equal(500)
    expect(BTCRate).to.be.equal(12000)
    expect(USDRate).to.be.equal(12)
  })

  it('should be able to get usd rate for currency that not put into map', async function() {
    const instance = await HotokenReservation.deployed()

    try {
      const UnknownCoinRate = (await instance.getUSDRate("UNKNOWN")).toNumber()
    } catch (e) {
      expect(e.toString()).to.be.include('revert')
    }
  })

  it('should not be able to set usd rate for any currency if not call by contract owner', async function() {
    const instance = await HotokenReservation.deployed()
    const user1 = accounts[1]

    const ETHRateBefore = (await instance.getUSDRate("ETH")).toNumber()
    const BTCRateBefore = (await instance.getUSDRate("BTC")).toNumber()
    const USDRateBefore = (await instance.getUSDRate("USD")).toNumber()

    try {
      await instance.setUSDRate("ETH", 600, {from: user1})
      await instance.setUSDRate("BTC", 13000, {from: user1})
      await instance.setUSDRate("USD", 20, {from: user1})
    } catch (e) {
      expect(e.toString()).to.be.include('revert')
    }

    const ETHRateAfter = (await instance.getUSDRate("ETH")).toNumber()
    const BTCRateAfter = (await instance.getUSDRate("BTC")).toNumber()
    const USDRateAfter = (await instance.getUSDRate("USD")).toNumber()

    // should be the same as above that we set ETH => 500, BTC => 12000, USD => 12
    expect(ETHRateAfter).to.be.equal(ETHRateBefore)
    expect(BTCRateAfter).to.be.equal(BTCRateBefore)
    expect(USDRateAfter).to.be.equal(USDRateBefore)
  })
})

contract('HotokenReservation set minimum purchase', function(accounts) {

  it('should have initial value for minimum purchase', async function() {
    const instance = await HotokenReservation.deployed()

    const initialMinimum = (await instance.getMinimumPurchase()).toNumber()
    expect(initialMinimum).to.be.equal(50000)
  })

  it('should be able to get value for minimum purchase by not owner contract', async function() {
    const instance = await HotokenReservation.deployed()
    const user1 = accounts[1]

    const initialMinimum = (await instance.getMinimumPurchase({from: user1})).toNumber()
    expect(initialMinimum).to.be.equal(50000)
  })

  it('should be able to set minimum purchase value', async function() {
    const instance = await HotokenReservation.deployed()
    const newMinimumPurchase = 10000
    await instance.setMinimumPurchase(newMinimumPurchase)

    const currentMinimum = (await instance.getMinimumPurchase()).toNumber()
    expect(currentMinimum).to.be.equal(newMinimumPurchase)
  })

  it('should not be able to set minimum purchase value if not call by owner contract', async function() {
    const instance = await HotokenReservation.deployed()
    const user1 = accounts[1]
    const currentMinimumPurchase = (await instance.getMinimumPurchase()).toNumber()
    const newMinimumPurchase = 200
    try {
      await instance.setMinimumPurchase(newMinimumPurchase, {from: user1})
    } catch (e) {
      expect(e.toString()).to.be.include('revert')
    }

    const AfterMinimum = (await instance.getMinimumPurchase()).toNumber()
    expect(AfterMinimum).to.be.equal(currentMinimumPurchase)
  })
})

contract('HotokenReservation set pause state', function(accounts) {

  it('should have initial value for pause state after contract deployed', async function() {
    const instance = await HotokenReservation.deployed()
    const isPauseEnabled = (await instance.isPauseEnabled())
    expect(isPauseEnabled).to.be.false
  })

  it('should be able to set pause state', async function() {
    const instance = await HotokenReservation.deployed()
    const isPauseEnabledBefore = (await instance.isPauseEnabled())
    expect(isPauseEnabledBefore).to.be.false

    await instance.setPauseEnabled(true)
    const isPauseEnabledAfter = (await instance.isPauseEnabled())
    expect(isPauseEnabledAfter).to.be.not.equal(isPauseEnabledBefore)
    expect(isPauseEnabledAfter).to.be.true
  })

  it('should not be able to set pause state if not call by contract owner', async function() {
    const instance = await HotokenReservation.deployed()
    const isPauseEnabledBefore = (await instance.isPauseEnabled())
    const user1 = accounts[1]

    try {
      await instance.setPauseEnabled(true)
    } catch (e) {
      expect(e.toString()).to.be.include('revert')
    }
    const isPauseEnabledAfter = (await instance.isPauseEnabled())
    expect(isPauseEnabledAfter).to.be.equal(isPauseEnabledBefore)
  })
})

contract('HotokenReservation add information to ledger', function(accounts) {

  it('should be able to check address exists in the ledger', async function() {
    const instance = await HotokenReservation.deployed()
    const user1 = accounts[1]

    const exists = await instance.existsInLedger(user1)
    expect(exists).to.be.false
  })

  it('should be able to add address information in the ledger', async function() {
    const instance = await HotokenReservation.deployed()
    const user1 = accounts[1]
    const amount = 100000

    await instance.addToLedger(user1, "ETH", amount, 20000)
    const exists = await instance.existsInLedger(user1)
    expect(exists).to.be.true
  })

  it('should not be able to add address information in the ledger if not call by owner', async function() {
    const instance = await HotokenReservation.deployed()
    const user1 = accounts[1]
    const user2 = accounts[2]
    const amount = 100000

    try {
      await instance.addToLedger(user2, "ETH", amount, 20000, {from: user1})
    } catch (e) {
      expect(e.toString()).to.be.include('revert')
    }
    const exists = await instance.existsInLedger(user2)
    expect(exists).to.be.false
  })

  it('should not be able to add address information in the ledger that currency is not in usd rate map', async function() {
    const instance = await HotokenReservation.deployed()
    const user2 = accounts[2]
    const amount = 100000

    try {
      await instance.addToLedger(user2, "LTC", amount, 20000)
    } catch (e) {
      expect(e.toString()).to.be.include('revert')
    }
    const exists = await instance.existsInLedger(user2)
    expect(exists).to.be.false
  })

  it('should not be able to add owner address information in the ledger', async function() {
    const instance = await HotokenReservation.deployed()
    const owner = accounts[0]
    const amount = 100000

    try {
      await instance.addToLedger(owner, "ETH", amount, 20000)
    } catch (e) {
      expect(e.toString()).to.be.include('revert')
    }
    const exists = await instance.existsInLedger(owner)
    expect(exists).to.be.false
  })
})

contract('HotokenReservation transfer token', function(accounts) {

  it('should be able to transfer token', async function() {
    const instance = await HotokenReservation.deployed()
    const user1 = accounts[1]
    await instance.setPauseEnabled(true)

    await instance.transfer(user1, 1000)
    expect((await instance.balanceOf(user1)).toNumber()).to.be.equal(1000)
  })

  it('should not be able transfer token by not owner address', async function() {
    const instance = await HotokenReservation.deployed()
    const user1 = accounts[1]
    const user2 = accounts[2]

    try {
      await instance.transfer(user2, 1000, {from: user1})
    } catch (e) {
      expect(e.toString()).to.be.include('revert')
    }
  })

  it('should not be able transfer token to 0x address', async function() {
    const instance = await HotokenReservation.deployed()

    try {
      await instance.transfer("0x0", 1000)
    } catch (e) {
      expect(e.toString()).to.be.include('revert')
    }
  })

  it('should not be able transfer token to owner contract itself', async function() {
    const instance = await HotokenReservation.deployed()

    try {
      await instance.transfer(accounts[0], 1000)
    } catch (e) {
      expect(e.toString()).to.be.include('revert')
    }
  })

  it('should not be able to transfer token when pause is enabled', async function() {
    const instance = await HotokenReservation.deployed()
    const user1 = accounts[1]
    await instance.setPauseEnabled(false)

    try {
      await instance.transfer(user1, 1000)
    } catch (e) {
      expect(e.toString()).to.be.include('revert')
    }
  })
})  