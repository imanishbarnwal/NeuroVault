import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("NeuroVaultRegistry", function () {
  async function deployFixture() {
    const [owner, contributor, buyer, other] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("NeuroVaultRegistry");
    const registry = await Registry.deploy();
    return { registry, owner, contributor, buyer, other };
  }

  // ── Dataset Registration ──────────────────────────────────────

  describe("Dataset Registration", function () {
    it("should register a dataset and emit DatasetRegistered", async function () {
      const { registry, contributor } = await deployFixture();
      const price = ethers.parseEther("0.1");

      await expect(
        registry
          .connect(contributor)
          .registerDataset("QmData123", "QmMeta456", price)
      )
        .to.emit(registry, "DatasetRegistered")
        .withArgs(0, contributor.address, "QmData123", "QmMeta456", price);
    });

    it("should store dataset correctly", async function () {
      const { registry, contributor } = await deployFixture();
      const price = ethers.parseEther("0.5");

      await registry
        .connect(contributor)
        .registerDataset("QmData", "QmMeta", price);

      const ds = await registry.getDataset(0);
      expect(ds.id).to.equal(0);
      expect(ds.contributor).to.equal(contributor.address);
      expect(ds.dataCID).to.equal("QmData");
      expect(ds.metadataCID).to.equal("QmMeta");
      expect(ds.price).to.equal(price);
      expect(ds.active).to.be.true;
    });

    it("should reject empty data CID", async function () {
      const { registry, contributor } = await deployFixture();
      await expect(
        registry.connect(contributor).registerDataset("", "QmMeta", 0)
      ).to.be.revertedWith("Data CID cannot be empty");
    });

    it("should reject empty metadata CID", async function () {
      const { registry, contributor } = await deployFixture();
      await expect(
        registry.connect(contributor).registerDataset("QmData", "", 0)
      ).to.be.revertedWith("Metadata CID cannot be empty");
    });

    it("should list all datasets", async function () {
      const { registry, contributor, buyer } = await deployFixture();

      await registry
        .connect(contributor)
        .registerDataset("QmData1", "QmMeta1", 0);
      await registry
        .connect(buyer)
        .registerDataset("QmData2", "QmMeta2", ethers.parseEther("1"));

      const all = await registry.listDatasets();
      expect(all.length).to.equal(2);
      expect(all[0].dataCID).to.equal("QmData1");
      expect(all[1].dataCID).to.equal("QmData2");
    });
  });

  // ── Access Licensing ──────────────────────────────────────────

  describe("Access Licensing", function () {
    it("should grant access on payment", async function () {
      const { registry, contributor, buyer } = await deployFixture();
      const price = ethers.parseEther("0.1");

      await registry
        .connect(contributor)
        .registerDataset("QmData", "QmMeta", price);

      await expect(
        registry.connect(buyer).purchaseAccess(0, { value: price })
      ).to.emit(registry, "AccessGranted");

      expect(await registry.checkAccess(buyer.address, 0)).to.be.true;
    });

    it("should expire access after 30 days", async function () {
      const { registry, contributor, buyer } = await deployFixture();
      const price = ethers.parseEther("0.1");

      await registry
        .connect(contributor)
        .registerDataset("QmData", "QmMeta", price);
      await registry.connect(buyer).purchaseAccess(0, { value: price });

      // Fast-forward 31 days
      await time.increase(31 * 24 * 60 * 60);

      expect(await registry.checkAccess(buyer.address, 0)).to.be.false;
    });

    it("should allow free access without payment", async function () {
      const { registry, contributor, buyer } = await deployFixture();

      await registry
        .connect(contributor)
        .registerDataset("QmData", "QmMeta", 0);

      expect(await registry.checkAccess(buyer.address, 0)).to.be.true;
    });

    it("should reject insufficient payment", async function () {
      const { registry, contributor, buyer } = await deployFixture();
      const price = ethers.parseEther("1");

      await registry
        .connect(contributor)
        .registerDataset("QmData", "QmMeta", price);

      await expect(
        registry
          .connect(buyer)
          .purchaseAccess(0, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("should reject duplicate active license", async function () {
      const { registry, contributor, buyer } = await deployFixture();
      const price = ethers.parseEther("0.1");

      await registry
        .connect(contributor)
        .registerDataset("QmData", "QmMeta", price);
      await registry.connect(buyer).purchaseAccess(0, { value: price });

      await expect(
        registry.connect(buyer).purchaseAccess(0, { value: price })
      ).to.be.revertedWith("Active license already exists");
    });
  });

  // ── Contributor Payments ──────────────────────────────────────

  describe("Contributor Payments", function () {
    it("should auto-pay contributor on purchase", async function () {
      const { registry, contributor, buyer } = await deployFixture();
      const price = ethers.parseEther("1");

      await registry
        .connect(contributor)
        .registerDataset("QmData", "QmMeta", price);

      const balBefore = await ethers.provider.getBalance(contributor.address);
      await registry.connect(buyer).purchaseAccess(0, { value: price });
      const balAfter = await ethers.provider.getBalance(contributor.address);

      expect(balAfter - balBefore).to.equal(price);
    });

    it("should track earnings", async function () {
      const { registry, contributor, buyer } = await deployFixture();
      const price = ethers.parseEther("0.5");

      await registry
        .connect(contributor)
        .registerDataset("QmData", "QmMeta", price);
      await registry.connect(buyer).purchaseAccess(0, { value: price });

      expect(
        await registry.getContributorEarnings(contributor.address)
      ).to.equal(price);
    });

    it("should track contributor datasets", async function () {
      const { registry, contributor } = await deployFixture();

      await registry
        .connect(contributor)
        .registerDataset("QmData1", "QmMeta1", 0);
      await registry
        .connect(contributor)
        .registerDataset("QmData2", "QmMeta2", ethers.parseEther("1"));

      const ids = await registry.getContributorDatasets(contributor.address);
      expect(ids.length).to.equal(2);
      expect(ids[0]).to.equal(0);
      expect(ids[1]).to.equal(1);
    });
  });
});
