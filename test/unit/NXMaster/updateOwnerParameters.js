const {
  constants: { AddressZero },
} = require('ethers');
const { assert, expect } = require('chai');

const { NXMasterOwnerParamType } = require('../utils').constants;

describe('updateOwnerParameters', function () {
  it('should revert when called by non governance addresses', async function () {
    const { master, accounts } = this;
    const param = NXMasterOwnerParamType.kycAuthority;
    const [nonMember] = accounts.nonMembers;

    await expect(master.connect(nonMember).updateOwnerParameters(param, AddressZero)).to.be.revertedWith(
      'Not authorized',
    );
  });

  it('should correctly update emergency admin parameter', async function () {
    const { master, governance } = this;

    const newAdmin = '0x0000000000000000000000000000000000000001';
    await governance.updateOwnerParameters(NXMasterOwnerParamType.emergencyAdmin, newAdmin);

    const emergencyAdmin = await master.emergencyAdmin();
    assert.equal(emergencyAdmin, newAdmin);
  });
});
