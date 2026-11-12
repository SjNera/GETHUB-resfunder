// SurveyEscrow tests. Source: docs/TDD.md section 6.4.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { network } from 'hardhat';
import { getAddress, keccak256, parseEther, toHex, zeroAddress, type Address } from 'viem';

const { viem, networkHelpers } = await network.create();
const publicClient = await viem.getPublicClient();

const GAS = parseEther('0.0001'); // gasPerResponse
const PROFIT = parseEther('0.00005'); // minProfitPerResponse
const FEE = GAS + PROFIT; // feePerResponse at the minimum
const RATE = parseEther('0.001');
const QUOTA = 3n;
const BUDGET = RATE * QUOTA;
const DEPOSIT = BUDGET + QUOTA * FEE;
const SURVEY_HASH = keccak256(toHex('demo survey'));
const REASON = keccak256(toHex('["Passed all checks."]'));
const PAY = 1;
const DONT_PAY = 0;
const HOUR = 3600n;

const deposit = (rate: bigint, quota: bigint, fee: bigint) => rate * quota + quota * fee;
const balanceOf = (address: Address) => publicClient.getBalance({ address });

async function deployFixture() {
  const [deployer, agent, platform, researcher, r1, r2, r3, stranger] = await viem.getWalletClients();
  const escrow = await viem.deployContract('SurveyEscrow', [agent.account.address, platform.account.address, GAS, PROFIT]);
  return { escrow, deployer, agent, platform, researcher, r1, r2, r3, stranger };
}

type Ctx = Awaited<ReturnType<typeof deployFixture>>;

async function deadlineIn(seconds: bigint) {
  return BigInt(await networkHelpers.time.latest()) + seconds;
}

/** Funds the standard survey from the researcher. Returns its id and deadline. */
async function fund(ctx: Ctx, opts: { rate?: bigint; quota?: bigint; fee?: bigint } = {}) {
  const rate = opts.rate ?? RATE;
  const quota = opts.quota ?? QUOTA;
  const fee = opts.fee ?? FEE;
  const deadline = await deadlineIn(HOUR);
  const id = await ctx.escrow.read.nextSurveyId();
  await ctx.escrow.write.createSurvey([SURVEY_HASH, rate, quota, deadline, fee], {
    account: ctx.researcher.account,
    value: deposit(rate, quota, fee),
  });
  return { id, deadline };
}

function decide(ctx: Ctx, id: bigint, respondent: Address, decision: number, as = ctx.agent) {
  return ctx.escrow.write.recordDecision([id, respondent, decision, REASON], { account: as.account });
}

async function survey(ctx: Ctx, id: bigint) {
  const [researcher, surveyHash, rate, quota, deadline, balance, paidCount, closed] = await ctx.escrow.read.surveys([id]);
  return { researcher, surveyHash, rate, quota, deadline, balance, paidCount, closed };
}

describe('SurveyEscrow', () => {
  describe('constructor', () => {
    it('stores the immutable settings', async () => {
      const ctx = await networkHelpers.loadFixture(deployFixture);
      assert.equal(await ctx.escrow.read.agent(), getAddress(ctx.agent.account.address));
      assert.equal(await ctx.escrow.read.platform(), getAddress(ctx.platform.account.address));
      assert.equal(await ctx.escrow.read.gasPerResponse(), GAS);
      assert.equal(await ctx.escrow.read.minProfitPerResponse(), PROFIT);
      assert.equal(await ctx.escrow.read.nextSurveyId(), 1n);
    });

    it('reverts on a zero agent or platform address', async () => {
      const [, agent, platform] = await viem.getWalletClients();
      const ref = await viem.deployContract('SurveyEscrow', [agent.account.address, platform.account.address, GAS, PROFIT]);
      await viem.assertions.revertWithCustomError(
        viem.deployContract('SurveyEscrow', [zeroAddress, platform.account.address, GAS, PROFIT]),
        ref,
        'ZeroAddress',
      );
      await viem.assertions.revertWithCustomError(
        viem.deployContract('SurveyEscrow', [agent.account.address, zeroAddress, GAS, PROFIT]),
        ref,
        'ZeroAddress',
      );
    });
  });

  describe('createSurvey', () => {
    it('accepts the exact deposit and stores the survey', async () => {
      const ctx = await networkHelpers.loadFixture(deployFixture);
      const { id, deadline } = await fund(ctx);
      assert.equal(id, 1n);
      const s = await survey(ctx, id);
      assert.equal(s.researcher, getAddress(ctx.researcher.account.address));
      assert.equal(s.surveyHash, SURVEY_HASH);
      assert.equal(s.rate, RATE);
      assert.equal(s.quota, QUOTA);
      assert.equal(s.deadline, deadline);
      assert.equal(s.balance, BUDGET);
      assert.equal(s.paidCount, 0n);
      assert.equal(s.closed, false);
      assert.equal(await ctx.escrow.read.nextSurveyId(), 2n);
    });

    it('reverts WrongDeposit for one wei more or one wei less', async () => {
      const ctx = await networkHelpers.loadFixture(deployFixture);
      const deadline = await deadlineIn(HOUR);
      for (const value of [DEPOSIT + 1n, DEPOSIT - 1n]) {
        await viem.assertions.revertWithCustomError(
          ctx.escrow.write.createSurvey([SURVEY_HASH, RATE, QUOTA, deadline, FEE], { account: ctx.researcher.account, value }),
          ctx.escrow,
          'WrongDeposit',
        );
      }
    });

    it('reverts FeeTooLow below gasPerResponse + minProfitPerResponse', async () => {
      const ctx = await networkHelpers.loadFixture(deployFixture);
      const deadline = await deadlineIn(HOUR);
      const fee = FEE - 1n;
      await viem.assertions.revertWithCustomError(
        ctx.escrow.write.createSurvey([SURVEY_HASH, RATE, QUOTA, deadline, fee], {
          account: ctx.researcher.account,
          value: deposit(RATE, QUOTA, fee),
        }),
        ctx.escrow,
        'FeeTooLow',
      );
    });

    it('accepts a fee above the minimum and gives the extra to the platform', async () => {
      const ctx = await networkHelpers.loadFixture(deployFixture);
      const fee = FEE + parseEther('0.00001');
      const deadline = await deadlineIn(HOUR);
      await viem.assertions.balancesHaveChanged(
        ctx.escrow.write.createSurvey([SURVEY_HASH, RATE, QUOTA, deadline, fee], {
          account: ctx.researcher.account,
          value: deposit(RATE, QUOTA, fee),
        }),
        [
          { address: ctx.agent.account.address, amount: QUOTA * GAS },
          { address: ctx.platform.account.address, amount: QUOTA * (fee - GAS) },
          { address: ctx.escrow.address, amount: BUDGET },
        ],
      );
    });

    it('reverts InvalidSurvey on zero rate, zero quota, or a past deadline', async () => {
      const ctx = await networkHelpers.loadFixture(deployFixture);
      const future = await deadlineIn(HOUR);
      const now = BigInt(await networkHelpers.time.latest());
      const cases: [bigint, bigint, bigint][] = [
        [0n, QUOTA, future],
        [RATE, 0n, future],
        [RATE, QUOTA, now],
      ];
      for (const [rate, quota, deadline] of cases) {
        await viem.assertions.revertWithCustomError(
          ctx.escrow.write.createSurvey([SURVEY_HASH, rate, quota, deadline, FEE], {
            account: ctx.researcher.account,
            value: deposit(rate, quota, FEE),
          }),
          ctx.escrow,
          'InvalidSurvey',
        );
      }
    });

    it('splits the fee: agent gets quota x gas, platform the rest, contract keeps the budget', async () => {
      const ctx = await networkHelpers.loadFixture(deployFixture);
      const deadline = await deadlineIn(HOUR);
      await viem.assertions.balancesHaveChanged(
        ctx.escrow.write.createSurvey([SURVEY_HASH, RATE, QUOTA, deadline, FEE], {
          account: ctx.researcher.account,
          value: DEPOSIT,
        }),
        [
          { address: ctx.agent.account.address, amount: QUOTA * GAS },
          { address: ctx.platform.account.address, amount: QUOTA * (FEE - GAS) },
          { address: ctx.escrow.address, amount: BUDGET },
        ],
      );
      assert.equal(await balanceOf(ctx.escrow.address), BUDGET);
    });

    it('emits SurveyCreated with the survey fields', async () => {
      const ctx = await networkHelpers.loadFixture(deployFixture);
      const deadline = await deadlineIn(HOUR);
      await viem.assertions.emitWithArgs(
        ctx.escrow.write.createSurvey([SURVEY_HASH, RATE, QUOTA, deadline, FEE], {
          account: ctx.researcher.account,
          value: DEPOSIT,
        }),
        ctx.escrow,
        'SurveyCreated',
        [1n, getAddress(ctx.researcher.account.address), SURVEY_HASH, RATE, QUOTA, deadline, FEE],
      );
    });
  });

  describe('recordDecision', () => {
    it('reverts NotAgent for anyone but the agent', async () => {
      const ctx = await networkHelpers.loadFixture(deployFixture);
      const { id } = await fund(ctx);
      for (const caller of [ctx.stranger, ctx.researcher, ctx.deployer]) {
        await viem.assertions.revertWithCustomError(decide(ctx, id, ctx.r1.account.address, PAY, caller), ctx.escrow, 'NotAgent');
      }
    });

    it('reverts SurveyNotFound for an unknown survey', async () => {
      const ctx = await networkHelpers.loadFixture(deployFixture);
      await viem.assertions.revertWithCustomError(decide(ctx, 99n, ctx.r1.account.address, PAY), ctx.escrow, 'SurveyNotFound');
    });

    it('Pay sends exactly the rate to the respondent and updates the survey', async () => {
      const ctx = await networkHelpers.loadFixture(deployFixture);
      const { id } = await fund(ctx);
      await viem.assertions.balancesHaveChanged(decide(ctx, id, ctx.r1.account.address, PAY), [
        { address: ctx.r1.account.address, amount: RATE },
        { address: ctx.escrow.address, amount: -RATE },
      ]);
      const s = await survey(ctx, id);
      assert.equal(s.paidCount, 1n);
      assert.equal(s.balance, BUDGET - RATE);
      assert.equal(await ctx.escrow.read.decided([id, ctx.r1.account.address]), true);
    });

    it('Pay emits Paid with the reason hash and amount', async () => {
      const ctx = await networkHelpers.loadFixture(deployFixture);
      const { id } = await fund(ctx);
      await viem.assertions.emitWithArgs(decide(ctx, id, ctx.r1.account.address, PAY), ctx.escrow, 'Paid', [
        id,
        getAddress(ctx.r1.account.address),
        REASON,
        RATE,
      ]);
    });

    it('DontPay moves no money and emits Blocked', async () => {
      const ctx = await networkHelpers.loadFixture(deployFixture);
      const { id } = await fund(ctx);
      await viem.assertions.balancesHaveChanged(decide(ctx, id, ctx.r1.account.address, DONT_PAY), [
        { address: ctx.r1.account.address, amount: 0n },
        { address: ctx.escrow.address, amount: 0n },
      ]);
      await viem.assertions.emitWithArgs(decide(ctx, id, ctx.r2.account.address, DONT_PAY), ctx.escrow, 'Blocked', [
        id,
        getAddress(ctx.r2.account.address),
        REASON,
      ]);
      const s = await survey(ctx, id);
      assert.equal(s.paidCount, 0n);
      assert.equal(s.balance, BUDGET);
      assert.equal(await ctx.escrow.read.decided([id, ctx.r1.account.address]), true);
    });

    it('reverts AlreadyDecided on a second decision after Pay', async () => {
      const ctx = await networkHelpers.loadFixture(deployFixture);
      const { id } = await fund(ctx);
      await decide(ctx, id, ctx.r1.account.address, PAY);
      for (const d of [PAY, DONT_PAY]) {
        await viem.assertions.revertWithCustomError(decide(ctx, id, ctx.r1.account.address, d), ctx.escrow, 'AlreadyDecided');
      }
    });

    it('reverts AlreadyDecided on a second decision after DontPay', async () => {
      const ctx = await networkHelpers.loadFixture(deployFixture);
      const { id } = await fund(ctx);
      await decide(ctx, id, ctx.r1.account.address, DONT_PAY);
      for (const d of [PAY, DONT_PAY]) {
        await viem.assertions.revertWithCustomError(decide(ctx, id, ctx.r1.account.address, d), ctx.escrow, 'AlreadyDecided');
      }
    });

    it('reverts SurveyNotOpen when the survey is closed', async () => {
      const ctx = await networkHelpers.loadFixture(deployFixture);
      const { id } = await fund(ctx);
      await ctx.escrow.write.closeSurvey([id], { account: ctx.researcher.account });
      await viem.assertions.revertWithCustomError(decide(ctx, id, ctx.r1.account.address, PAY), ctx.escrow, 'SurveyNotOpen');
    });

    it('allows a decision at the deadline and reverts SurveyNotOpen after it', async () => {
      const ctx = await networkHelpers.loadFixture(deployFixture);
      const { id, deadline } = await fund(ctx);
      // The next block is mined at exactly `deadline`.
      await networkHelpers.time.setNextBlockTimestamp(deadline);
      await decide(ctx, id, ctx.r1.account.address, PAY);
      await viem.assertions.revertWithCustomError(decide(ctx, id, ctx.r2.account.address, PAY), ctx.escrow, 'SurveyNotOpen');
    });

    it('reverts QuotaFull once paidCount reaches the quota, for Pay and DontPay', async () => {
      const ctx = await networkHelpers.loadFixture(deployFixture);
      const { id } = await fund(ctx, { quota: 2n });
      await decide(ctx, id, ctx.r1.account.address, PAY);
      await decide(ctx, id, ctx.r2.account.address, PAY);
      for (const d of [PAY, DONT_PAY]) {
        await viem.assertions.revertWithCustomError(decide(ctx, id, ctx.r3.account.address, d), ctx.escrow, 'QuotaFull');
      }
      assert.equal((await survey(ctx, id)).balance, 0n);
    });

    it('DontPay decisions do not use up the quota', async () => {
      const ctx = await networkHelpers.loadFixture(deployFixture);
      const { id } = await fund(ctx, { quota: 1n });
      await decide(ctx, id, ctx.r1.account.address, DONT_PAY);
      await decide(ctx, id, ctx.r2.account.address, DONT_PAY);
      await decide(ctx, id, ctx.r3.account.address, PAY);
      assert.equal((await survey(ctx, id)).paidCount, 1n);
    });

    it('reverts TransferFailed and records nothing when the respondent rejects payment', async () => {
      const ctx = await networkHelpers.loadFixture(deployFixture);
      const { id } = await fund(ctx);
      const rejecter = await viem.deployContract('RejectingReceiver');
      await viem.assertions.revertWithCustomError(decide(ctx, id, rejecter.address, PAY), ctx.escrow, 'TransferFailed');
      assert.equal(await ctx.escrow.read.decided([id, rejecter.address]), false);
      const s = await survey(ctx, id);
      assert.equal(s.paidCount, 0n);
      assert.equal(s.balance, BUDGET);
    });
  });

  describe('closeSurvey', () => {
    it('lets the researcher close at any time and refunds the full budget', async () => {
      const ctx = await networkHelpers.loadFixture(deployFixture);
      const { id } = await fund(ctx);
      await viem.assertions.balancesHaveChanged(ctx.escrow.write.closeSurvey([id], { account: ctx.researcher.account }), [
        { address: ctx.escrow.address, amount: -BUDGET },
      ]);
      const s = await survey(ctx, id);
      assert.equal(s.closed, true);
      assert.equal(s.balance, 0n);
    });

    it('refunds budget - paidCount x rate to the researcher and emits Closed', async () => {
      const ctx = await networkHelpers.loadFixture(deployFixture);
      const { id } = await fund(ctx);
      await decide(ctx, id, ctx.r1.account.address, PAY);
      await decide(ctx, id, ctx.r2.account.address, DONT_PAY);
      const refund = BUDGET - 1n * RATE;
      // Agent closes after the deadline so the researcher's balance change has no gas in it.
      await networkHelpers.time.increase(HOUR + 1n);
      await viem.assertions.balancesHaveChanged(ctx.escrow.write.closeSurvey([id], { account: ctx.agent.account }), [
        { address: ctx.researcher.account.address, amount: refund },
        { address: ctx.escrow.address, amount: -refund },
      ]);
      await viem.assertions.revertWithCustomError(
        ctx.escrow.write.closeSurvey([id], { account: ctx.researcher.account }),
        ctx.escrow,
        'AlreadyClosed',
      );
    });

    it('emits Closed with the refunded amount', async () => {
      const ctx = await networkHelpers.loadFixture(deployFixture);
      const { id } = await fund(ctx);
      await decide(ctx, id, ctx.r1.account.address, PAY);
      await viem.assertions.emitWithArgs(
        ctx.escrow.write.closeSurvey([id], { account: ctx.researcher.account }),
        ctx.escrow,
        'Closed',
        [id, getAddress(ctx.researcher.account.address), BUDGET - RATE],
      );
    });

    it('reverts NotAllowed for the agent before the deadline with the quota not full', async () => {
      const ctx = await networkHelpers.loadFixture(deployFixture);
      const { id } = await fund(ctx);
      await decide(ctx, id, ctx.r1.account.address, PAY);
      await viem.assertions.revertWithCustomError(
        ctx.escrow.write.closeSurvey([id], { account: ctx.agent.account }),
        ctx.escrow,
        'NotAllowed',
      );
    });

    it('lets the agent close after the deadline', async () => {
      const ctx = await networkHelpers.loadFixture(deployFixture);
      const { id, deadline } = await fund(ctx);
      await networkHelpers.time.increaseTo(deadline + 1n);
      await ctx.escrow.write.closeSurvey([id], { account: ctx.agent.account });
      assert.equal((await survey(ctx, id)).closed, true);
    });

    it('lets the agent close when the quota is full', async () => {
      const ctx = await networkHelpers.loadFixture(deployFixture);
      const { id } = await fund(ctx, { quota: 1n });
      await decide(ctx, id, ctx.r1.account.address, PAY);
      await viem.assertions.balancesHaveChanged(ctx.escrow.write.closeSurvey([id], { account: ctx.agent.account }), [
        { address: ctx.researcher.account.address, amount: 0n },
      ]);
      assert.equal((await survey(ctx, id)).closed, true);
    });

    it('reverts NotAllowed for a stranger, even after the deadline', async () => {
      const ctx = await networkHelpers.loadFixture(deployFixture);
      const { id, deadline } = await fund(ctx);
      await viem.assertions.revertWithCustomError(
        ctx.escrow.write.closeSurvey([id], { account: ctx.stranger.account }),
        ctx.escrow,
        'NotAllowed',
      );
      await networkHelpers.time.increaseTo(deadline + 1n);
      await viem.assertions.revertWithCustomError(
        ctx.escrow.write.closeSurvey([id], { account: ctx.stranger.account }),
        ctx.escrow,
        'NotAllowed',
      );
    });

    it('reverts SurveyNotFound for an unknown survey', async () => {
      const ctx = await networkHelpers.loadFixture(deployFixture);
      await viem.assertions.revertWithCustomError(
        ctx.escrow.write.closeSurvey([42n], { account: ctx.researcher.account }),
        ctx.escrow,
        'SurveyNotFound',
      );
    });

    it('reverts AlreadyClosed on a second close', async () => {
      const ctx = await networkHelpers.loadFixture(deployFixture);
      const { id } = await fund(ctx);
      await ctx.escrow.write.closeSurvey([id], { account: ctx.researcher.account });
      await viem.assertions.revertWithCustomError(
        ctx.escrow.write.closeSurvey([id], { account: ctx.researcher.account }),
        ctx.escrow,
        'AlreadyClosed',
      );
    });
  });

  describe('reentrancy', () => {
    it('a respondent re-entering recordDecision or closeSurvey on receive gets only the rate', async () => {
      const ctx = await networkHelpers.loadFixture(deployFixture);
      const { id } = await fund(ctx);
      const attacker = await viem.deployContract('ReentrantRespondent', [ctx.escrow.address]);
      await attacker.write.setSurvey([id]);
      await viem.assertions.balancesHaveChanged(decide(ctx, id, attacker.address, PAY), [
        { address: attacker.address, amount: RATE },
        { address: ctx.escrow.address, amount: -RATE },
      ]);
      assert.equal(await attacker.read.receiveCount(), 1n);
      assert.equal(await attacker.read.reenterDecisionOk(), false);
      assert.equal(await attacker.read.reenterCloseOk(), false);
      const s = await survey(ctx, id);
      assert.equal(s.paidCount, 1n);
      assert.equal(s.closed, false);
    });

    it('a researcher contract re-entering closeSurvey on refund is refunded once', async () => {
      const ctx = await networkHelpers.loadFixture(deployFixture);
      const attacker = await viem.deployContract('ReentrantResearcher', [ctx.escrow.address]);
      const deadline = await deadlineIn(HOUR);
      await attacker.write.fund([SURVEY_HASH, RATE, QUOTA, deadline, FEE], { value: DEPOSIT });
      // A second, honest survey shares the contract balance.
      const other = await fund(ctx);
      const id = await attacker.read.surveyId();

      await viem.assertions.balancesHaveChanged(attacker.write.close(), [
        { address: attacker.address, amount: BUDGET },
        { address: ctx.escrow.address, amount: -BUDGET },
      ]);
      assert.equal(await attacker.read.receiveCount(), 1n);
      assert.equal(await attacker.read.reenterCloseOk(), false);
      assert.equal(await attacker.read.reenterDecisionOk(), false);
      assert.equal((await survey(ctx, id)).closed, true);
      assert.equal((await survey(ctx, other.id)).balance, BUDGET);
      assert.equal(await balanceOf(ctx.escrow.address), BUDGET);
    });
  });

  describe('isolation', () => {
    it('two surveys do not share balances', async () => {
      const ctx = await networkHelpers.loadFixture(deployFixture);
      const a = await fund(ctx);
      const b = await fund(ctx, { rate: RATE * 2n, quota: 2n });
      assert.equal(await balanceOf(ctx.escrow.address), BUDGET + RATE * 2n * 2n);

      // Fill A's quota. B is untouched.
      await decide(ctx, a.id, ctx.r1.account.address, PAY);
      await decide(ctx, a.id, ctx.r2.account.address, PAY);
      await decide(ctx, a.id, ctx.r3.account.address, PAY);
      await viem.assertions.revertWithCustomError(decide(ctx, a.id, ctx.stranger.account.address, PAY), ctx.escrow, 'QuotaFull');
      assert.equal((await survey(ctx, b.id)).balance, RATE * 2n * 2n);

      // The same respondent can be decided in each survey once.
      await decide(ctx, b.id, ctx.r1.account.address, PAY);
      assert.equal((await survey(ctx, b.id)).balance, RATE * 2n);

      // Closing A refunds nothing from B.
      await ctx.escrow.write.closeSurvey([a.id], { account: ctx.researcher.account });
      assert.equal((await survey(ctx, a.id)).balance, 0n);
      assert.equal((await survey(ctx, b.id)).balance, RATE * 2n);
      assert.equal(await balanceOf(ctx.escrow.address), RATE * 2n);
    });
  });
});

