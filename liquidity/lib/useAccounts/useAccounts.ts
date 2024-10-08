import { useAccountProxy } from '@snx-v3/useAccountProxy';
import { useNetwork, useWallet } from '@snx-v3/useBlockchain';
import { useCoreProxy } from '@snx-v3/useCoreProxy';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useAccounts() {
  const { activeWallet } = useWallet();
  const { data: AccountProxy } = useAccountProxy();
  const { network } = useNetwork();

  return useQuery({
    queryKey: [
      `${network?.id}-${network?.preset}`,
      'Accounts',
      { accountAddress: activeWallet?.address, AccountProxy: AccountProxy?.address },
    ],
    enabled: Boolean(AccountProxy && activeWallet?.address),
    queryFn: async function () {
      if (!(AccountProxy && activeWallet?.address)) throw new Error('Should be disabled');

      const numberOfAccountTokens = await AccountProxy.balanceOf(activeWallet.address);

      if (numberOfAccountTokens.eq(0)) {
        // No accounts created yet
        return [];
      }
      const accountIndexes = Array.from(Array(numberOfAccountTokens.toNumber()).keys());
      const accounts = await Promise.all(
        accountIndexes.map(async (i) => {
          if (!activeWallet?.address) throw new Error('OMG!');
          return await AccountProxy.tokenOfOwnerByIndex(activeWallet.address, i);
        })
      );
      return accounts.map((accountId) => accountId.toString());
    },
    placeholderData: [],
  });
}

export function useCreateAccount() {
  const { data: CoreProxy } = useCoreProxy();
  const { network } = useNetwork();
  const client = useQueryClient();
  return {
    enabled: Boolean(network && CoreProxy),
    mutation: useMutation({
      mutationFn: async function () {
        try {
          if (!CoreProxy) {
            throw new Error('OMG');
          }
          const tx = await CoreProxy['createAccount()']();
          const res = await tx.wait();

          await client.invalidateQueries({
            queryKey: [`${network?.id}-${network?.preset}`, 'Accounts'],
          });

          let newAccountId: string | undefined;

          res.logs.forEach((log: any) => {
            if (log.topics[0] === CoreProxy.interface.getEventTopic('AccountCreated')) {
              const accountId = CoreProxy.interface.decodeEventLog(
                'AccountCreated',
                log.data,
                log.topics
              )?.accountId;
              newAccountId = accountId?.toString();
            }
          });

          return [newAccountId];
        } catch (error) {
          console.error(error);
          throw error;
        }
      },
    }),
  };
}
