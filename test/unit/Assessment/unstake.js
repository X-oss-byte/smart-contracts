const { expect } = require('chai');
const { ethers } = require('hardhat');
const { setTime } = require('./helpers');

const { parseEther } = ethers.utils;
const daysToSeconds = days => days * 24 * 60 * 60;

describe('unstake', function () {
  it("decreases the user's stake", async function () {
    const { assessment } = this.contracts;
    const user = this.accounts.members[0];
    await assessment.connect(user).stake(parseEther('100'));

    {
      await assessment.connect(user).unstake(parseEther('10'), user.address);
      const { amount } = await assessment.stakeOf(user.address);
      expect(amount).to.be.equal(parseEther('90'));
    }

    {
      await assessment.connect(user).unstake(parseEther('10'), user.address);
      const { amount } = await assessment.stakeOf(user.address);
      expect(amount).to.be.equal(parseEther('80'));
    }

    {
      await assessment.connect(user).unstake(parseEther('30'), user.address);
      const { amount } = await assessment.stakeOf(user.address);
      expect(amount).to.be.equal(parseEther('50'));
    }

    {
      await assessment.connect(user).unstake(parseEther('50'), user.address);
      const { amount } = await assessment.stakeOf(user.address);
      expect(amount).to.be.equal(parseEther('0'));
    }
  });

  it('transfers the staked NXM to the provided address', async function () {
    const { assessment, nxm } = this.contracts;
    const user1 = this.accounts.members[0];
    const user2 = this.accounts.members[1];
    await assessment.connect(user1).stake(parseEther('100'));

    {
      const nxmBalanceBefore = await nxm.balanceOf(user1.address);
      await assessment.connect(user1).unstake(parseEther('50'), user1.address);
      const nxmBalanceAfter = await nxm.balanceOf(user1.address);
      expect(nxmBalanceAfter).to.be.equal(nxmBalanceBefore.add(parseEther('50')));
    }

    {
      const nxmBalanceBefore = await nxm.balanceOf(user2.address);
      await assessment.connect(user1).unstake(parseEther('50'), user2.address);
      const nxmBalanceAfter = await nxm.balanceOf(user2.address);
      expect(nxmBalanceAfter).to.be.equal(nxmBalanceBefore.add(parseEther('50')));
    }
  });

  it("reverts if less than stakeLockupPeriodInDays passed since the staker's last vote", async function () {
    const { assessment, individualClaims } = this.contracts;
    const user = this.accounts.members[0];
    await assessment.connect(user).stake(parseEther('100'));
    await individualClaims.submitClaim(0, 0, parseEther('100'), '');
    await assessment.connect(user).castVotes([0], [true], ['Assessment data hash'], 0);
    await expect(assessment.connect(user).unstake(parseEther('100'), user.address)).to.be.revertedWith(
      'Stake is in lockup period',
    );

    const { stakeLockupPeriodInDays } = await assessment.config();
    const { timestamp } = await ethers.provider.getBlock('latest');
    for (let i = 1; i < stakeLockupPeriodInDays; i++) {
      await setTime(timestamp + daysToSeconds(i));
      await expect(assessment.connect(user).unstake(parseEther('100'), user.address)).to.be.revertedWith(
        'Stake is in lockup period',
      );
    }
    await setTime(timestamp + daysToSeconds(stakeLockupPeriodInDays));
    await expect(assessment.connect(user).unstake(parseEther('100'), user.address)).not.to.be.revertedWith(
      'Stake is in lockup period',
    );
  });

  it('reverts if system is paused', async function () {
    const { assessment, master } = this.contracts;
    await master.setEmergencyPause(true);

    await expect(assessment.stake(parseEther('100'))).to.revertedWith('System is paused');
  });

  it('does not revert if amount is 0', async function () {
    const { assessment } = this.contracts;
    const user = this.accounts.members[0];
    await assessment.connect(user).stake(parseEther('100'));

    await expect(assessment.connect(user).unstake(0, user.address)).to.not.reverted;
  });

  it('reverts if amount is bigger than the stake', async function () {
    const { assessment } = this.contracts;
    const user = this.accounts.members[0];
    await assessment.connect(user).stake(parseEther('100'));

    // reverts with math underflow check: panic code 0x11
    await expect(assessment.connect(user).unstake(parseEther('150'), user.address)).to.be.reverted;
  });

  it('emits StakeWithdrawn event with staker, destination and amount', async function () {
    const { assessment } = this.contracts;
    const [user1, user2] = this.accounts.members;
    await assessment.connect(user1).stake(parseEther('100'));

    {
      const amount = parseEther('10');
      await expect(assessment.connect(user1).unstake(amount, user1.address))
        .to.emit(assessment, 'StakeWithdrawn')
        .withArgs(user1.address, user1.address, amount);
    }

    {
      const amount = parseEther('20');
      await expect(assessment.connect(user1).unstake(amount, user2.address))
        .to.emit(assessment, 'StakeWithdrawn')
        .withArgs(user1.address, user2.address, amount);
    }
  });

  it('reverts if attempting to stake while NXM is locked for voting in governance', async function () {
    const { nxm, assessment } = this.contracts;
    const [user, otherUser] = this.accounts.members;
    await nxm.setLock(user.address, 100);
    await expect(assessment.connect(user).unstake(parseEther('100'), otherUser.address)).to.be.revertedWith(
      'Assessment: NXM is locked for voting in governance',
    );
  });

  it('allows to unstake to own address while NXM is locked for voting in governance', async function () {
    const { nxm, assessment } = this.contracts;
    const [user] = this.accounts.members;
    const amount = parseEther('100');

    await assessment.connect(user).stake(amount);
    const balanceBefore = await nxm.balanceOf(user.address);

    await nxm.setLock(user.address, 100);
    await assessment.connect(user).unstake(amount, user.address);

    const balanceAfter = await nxm.balanceOf(user.address);
    expect(balanceAfter).to.be.equal(balanceBefore.add(amount));
  });
});
