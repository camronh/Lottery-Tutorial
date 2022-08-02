const hre = require("hardhat");
const airnodeAdmin = require("@api3/airnode-admin");

module.exports = async () => {
  const [account] = await hre.ethers.getSigners();
  const Lottery = await hre.deployments.get("Lottery");
  const lotteryContract = new hre.ethers.Contract(
    Lottery.address,
    Lottery.abi,
    account
  );

  const sponsorWalletAddress = await airnodeAdmin.deriveSponsorWalletAddress(
    "xpub6DXSDTZBd4aPVXnv6Q3SmnGUweFv6j24SK77W4qrSFuhGgi666awUiXakjXruUSCDQhhctVG7AQt67gMdaRAsDnDXv23bBRKsMWvRzo6kbf", // QRNG xpub
    "0x9d3C147cA16DB954873A498e0af5852AB39139f2", // QRNG Airnode address
    lotteryContract.address
  );
  const tx = await lotteryContract.setSponsorWallet(sponsorWalletAddress);
  await tx.wait();
  console.log(`Sponsor wallet set to: ${sponsorWalletAddress}`);
};


module.exports.tags = ['setup'];