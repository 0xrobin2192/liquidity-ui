pragma solidity ^0.8.21;

import {PythERC7412Wrapper} from "@synthetixio/pyth-erc7412-wrapper/contracts/PythERC7412Wrapper.sol";
import {IUSDTokenModule} from "@synthetixio/main/contracts/interfaces/IUSDTokenModule.sol";
import {ICollateralModule} from "@synthetixio/main/contracts/interfaces/ICollateralModule.sol";
import {IVaultModule} from "@synthetixio/main/contracts/interfaces/IVaultModule.sol";
import {IAccountModule} from "@synthetixio/main/contracts/interfaces/IAccountModule.sol";
import {IAccountTokenModule} from "@synthetixio/main/contracts/interfaces/IAccountTokenModule.sol";
import {ICollateralConfigurationModule} from "@synthetixio/main/contracts/interfaces/ICollateralConfigurationModule.sol";
import {IERC20} from "@synthetixio/core-contracts/contracts/interfaces/IERC20.sol";
import {PositionManager} from "src/PositionManager.sol";
import {Test} from "forge-std/src/Test.sol";
import {Vm} from "forge-std/src/Vm.sol";
import {console} from "forge-std/src/console.sol";

contract PositionManager_setupPosition_Test is Test {
    address private USDProxy;
    address private CoreProxy;
    address private AccountProxy;
    address private CollateralToken_WETH;

    address private constant WETH_WHALE = 0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8;
    bytes32 private constant PYTH_FEED_ETH = 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;

    uint256 fork;

    constructor() {
        string memory root = vm.projectRoot();
        string memory metaPath =
            string.concat(root, "/../../node_modules/@synthetixio/v3-contracts/42161-main/meta.json");
        string memory metaJson = vm.readFile(metaPath);

        USDProxy = vm.parseJsonAddress(metaJson, ".contracts.USDProxy");
        vm.label(USDProxy, "USDProxy");

        AccountProxy = vm.parseJsonAddress(metaJson, ".contracts.AccountProxy");
        vm.label(AccountProxy, "AccountProxy");

        CoreProxy = vm.parseJsonAddress(metaJson, ".contracts.CoreProxy");
        vm.label(CoreProxy, "CoreProxy");

        CollateralToken_WETH = vm.parseJsonAddress(metaJson, ".contracts.CollateralToken_WETH");
        vm.label(CollateralToken_WETH, "$WETH");
    }

    function setUp() public {
        string memory forkUrl = string.concat("https://arbitrum-mainnet.infura.io/v3/", vm.envString("INFURA_KEY"));
        fork = vm.createFork(forkUrl, 285545346);
        vm.selectFork(fork);

        // Verify fork
        assertEq(block.number, 21419019);
        assertEq(vm.activeFork(), fork);

        // Pyth bypass
        vm.etch(0x1234123412341234123412341234123412341234, "FORK");
    }

    function test_setupPosition() public {
        uint128 ACCOUNT_ID = 7;
        uint128 POOL_ID = 1;
        address ALICE = vm.addr(0xA11CE);
        vm.label(ALICE, "0xA11CE");
        vm.deal(ALICE, 1 ether);

        vm.prank(WETH_WHALE);
        IERC20(CollateralToken_WETH).approve(address(this), UINT256_MAX);

        vm.prank(WETH_WHALE);
        IERC20(CollateralToken_WETH).transfer(ALICE, 10 ether);

        PositionManager positionManager = new PositionManager();
        vm.label(address(positionManager), "PositionManager");

        vm.prank(ALICE);
        IERC20(CollateralToken_WETH).approve(address(positionManager), UINT256_MAX);

        assertEq(0, IVaultModule(CoreProxy).getPositionDebt(ACCOUNT_ID, POOL_ID, CollateralToken_WETH));
        assertEq(0, IVaultModule(CoreProxy).getPositionCollateral(ACCOUNT_ID, POOL_ID, CollateralToken_WETH));
        assertEq(0, ICollateralModule(CoreProxy).getAccountAvailableCollateral(ACCOUNT_ID, CollateralToken_WETH));

        vm.prank(ALICE);
        positionManager.setupPosition(CoreProxy, AccountProxy, ACCOUNT_ID, POOL_ID, CollateralToken_WETH, 1 ether);

        assertEq(ALICE, IAccountTokenModule(AccountProxy).ownerOf(ACCOUNT_ID));

        assertEq(0, IVaultModule(CoreProxy).getPositionDebt(ACCOUNT_ID, POOL_ID, CollateralToken_WETH));
        assertEq(1 ether, IVaultModule(CoreProxy).getPositionCollateral(ACCOUNT_ID, POOL_ID, CollateralToken_WETH));
        assertEq(0, ICollateralModule(CoreProxy).getAccountAvailableCollateral(ACCOUNT_ID, CollateralToken_WETH));
    }

    function test_setupPosition_autoGeneratedAccount() public {
        uint128 ACCOUNT_ID = 0;
        uint128 POOL_ID = 1;
        address ALICE = vm.addr(0xA11CE);
        vm.label(ALICE, "0xA11CE");
        vm.deal(ALICE, 1 ether);

        vm.prank(WETH_WHALE);
        IERC20(CollateralToken_WETH).approve(address(this), UINT256_MAX);

        vm.prank(WETH_WHALE);
        IERC20(CollateralToken_WETH).transfer(ALICE, 10 ether);

        PositionManager positionManager = new PositionManager();
        vm.label(address(positionManager), "PositionManager");

        vm.prank(ALICE);
        IERC20(CollateralToken_WETH).approve(address(positionManager), UINT256_MAX);

        assertEq(0, IVaultModule(CoreProxy).getPositionDebt(ACCOUNT_ID, POOL_ID, CollateralToken_WETH));
        assertEq(0, IVaultModule(CoreProxy).getPositionCollateral(ACCOUNT_ID, POOL_ID, CollateralToken_WETH));
        assertEq(0, ICollateralModule(CoreProxy).getAccountAvailableCollateral(ACCOUNT_ID, CollateralToken_WETH));

        //        vm.recordLogs();
        vm.prank(ALICE);
        positionManager.setupPosition(CoreProxy, AccountProxy, ACCOUNT_ID, POOL_ID, CollateralToken_WETH, 1 ether);
        //        Vm.Log[] memory logs = vm.getRecordedLogs();

        // Verify "event AccountCreated(uint128 indexed accountId, address indexed owner)"
        //        assertEq(logs[1].topics[0], keccak256("AccountCreated(uint128,address)"));
        //        ACCOUNT_ID = uint128(uint256(logs[1].topics[1])); // We can get account ID

        // Use ERC721 enumerable to get the token ID (ACCOUNT_ID)
        uint256 numTokens = IAccountTokenModule(AccountProxy).balanceOf(ALICE);
        assertEq(numTokens, 1); // ALICE should own exactly 1 account NFT.

        // Retrieve ACCOUNT_ID via enumeration (index 0, since ALICE owns only one token).
        ACCOUNT_ID = uint128(IAccountTokenModule(AccountProxy).tokenOfOwnerByIndex(ALICE, 0));

        assertEq(ALICE, IAccountTokenModule(AccountProxy).ownerOf(ACCOUNT_ID));

        assertEq(0, IVaultModule(CoreProxy).getPositionDebt(ACCOUNT_ID, POOL_ID, CollateralToken_WETH));
        assertEq(1 ether, IVaultModule(CoreProxy).getPositionCollateral(ACCOUNT_ID, POOL_ID, CollateralToken_WETH));
        assertEq(0, ICollateralModule(CoreProxy).getAccountAvailableCollateral(ACCOUNT_ID, CollateralToken_WETH));
    }
}