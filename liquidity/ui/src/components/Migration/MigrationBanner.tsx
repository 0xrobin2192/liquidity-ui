import {
  Alert,
  AlertIcon,
  Button,
  Divider,
  Fade,
  Flex,
  Heading,
  Image,
  Link,
  Text,
} from '@chakra-ui/react';
import { Amount } from '@snx-v3/Amount';
import { Network, useNetwork, useWallet } from '@snx-v3/useBlockchain';
import { type HomePageSchemaType, useParams } from '@snx-v3/useParams';
import { useV2Position } from '@snx-v3/useV2Position';
import React from 'react';
import { MigrateUSDModal } from '../MigrateUSD/MigrateUSDModal';
import { MigrationDialog } from './MigrationDialog';

export function MigrationBanner({
  network,
  type = 'banner',
}: {
  network: Network;
  type?: 'banner' | 'alert';
}) {
  const [params, setParams] = useParams<HomePageSchemaType>();

  const [isOpen, setIsOpen] = React.useState(false);
  const [accountId, setAccountId] = React.useState('');
  const [isUSDModalOpen, setIsUSDModalOpen] = React.useState(false);
  const { data } = useV2Position(network);
  const { network: currentNetwork, setNetwork } = useNetwork();
  const { connect, activeWallet } = useWallet();

  const onClick = React.useCallback(async () => {
    try {
      if (!activeWallet) {
        connect();
        return;
      }

      if (!currentNetwork || currentNetwork.id !== network.id) {
        if (!(await setNetwork(network.id))) {
          return;
        }
      }

      setIsOpen(true);
    } catch (error) {}
  }, [activeWallet, connect, currentNetwork, network.id, setNetwork]);

  React.useEffect(() => {
    if (params.migrate?.toLowerCase() === 'snx') {
      setIsOpen(true);
      const { migrate: _migrate, ...newParams } = params;
      setParams(newParams);
    }
  }, [params, setParams]);

  return (
    <>
      <MigrationDialog
        onSuccess={(accountId) => {
          setAccountId(accountId);
          setIsUSDModalOpen(true);
        }}
        network={network}
        onClose={() => setIsOpen(false)}
        isOpen={isOpen}
      />
      <MigrateUSDModal
        network={network}
        onClose={() => setIsUSDModalOpen(false)}
        isOpen={isUSDModalOpen}
        type="migration"
        accountId={accountId}
      />

      {!!data && data?.collateral.gt(0) && data.debt.gt(0) && (
        <Fade in>
          {type === 'banner' && (
            <>
              <Divider my={4} />

              <Flex justifyContent={['center', 'space-between']} w="100%" flexWrap="wrap" gap={4}>
                <Image src="/Rocket.png" />

                <Flex mt={1} flex={1} alignItems="flex-start" flexDir="column" gap={6}>
                  <Heading fontSize="20px" fontWeight={700} color="white">
                    You have a <Amount value={data?.collateral} /> SNX position on Synthetix V2 on{' '}
                    <Text as="span" textTransform="capitalize">
                      {network.name}
                    </Text>
                  </Heading>
                  <Text maxW="484px" fontSize="14px" color="gray.500">
                    Migrate your SNX to Synthetix V3 to earn fees from both V2 and V3 markets and
                    much more.
                  </Text>
                </Flex>

                <Flex mt="auto" alignItems="flex-center" gap={2}>
                  <Button
                    fontSize="sm"
                    fontWeight={700}
                    colorScheme="gray"
                    variant="outline"
                    onClick={onClick}
                  >
                    {!activeWallet
                      ? 'Connect'
                      : currentNetwork?.id !== network.id
                        ? 'Switch Network'
                        : 'Migrate to V3'}
                  </Button>
                  <Link
                    href="https://blog.synthetix.io/synthetix-v3-migration-treasury-council-initiates-transition/"
                    target="_blank"
                    rel="noopener"
                  >
                    <Button fontSize="sm" fontWeight={700} variant="outline" colorScheme="gray">
                      Learn More
                    </Button>
                  </Link>
                </Flex>
              </Flex>
            </>
          )}

          {type === 'alert' ? (
            <Alert mb={6} borderLeftColor="cyan.500" borderRadius="6px">
              <AlertIcon color="cyan.500" />
              <Text color="white" fontFamily="heading" fontSize="16px" lineHeight="24px">
                You have a <Amount value={data?.collateral} /> SNX active staking position on V2 on{' '}
                <Text as="span" textTransform="capitalize">
                  {network.name}
                </Text>
                .{' '}
                <Text onClick={onClick} as="span" color="cyan.500" cursor="pointer">
                  Migrate to V3
                </Text>
              </Text>
            </Alert>
          ) : null}
        </Fade>
      )}
    </>
  );
}
