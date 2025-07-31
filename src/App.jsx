import {
  Box,
  Button,
  Center,
  color,
  Flex,
  Heading,
  Image,
  Input,
  SimpleGrid,
  Spinner,
  Text,
} from '@chakra-ui/react';
import { Alchemy, Network, Utils } from 'alchemy-sdk';
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
function App() {
  const [userAddress, setUserAddress] = useState('');
  const [results, setResults] = useState([]);
  const [hasQueried, setHasQueried] = useState(false);
  const [tokenDataObjects, setTokenDataObjects] = useState([]);
  const [walletAddress, setWalletAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState(null);
  const [displayedTokens, setDisplayedTokens] = useState([]);
  const [tokensPerPage] = useState(18); // Show 16 tokens initially
  const [currentPage, setCurrentPage] = useState(1);

  // Initialize provider and event listeners when component mounts
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const ethProvider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(ethProvider);

      // Event listeners
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setUserAddress(accounts[0]);
        } else {
          setWalletAddress('');
          setUserAddress('');
        }
      });

      window.ethereum.on('chainChanged', () => {
        console.log('Chain changed');
        window.location.reload();
      });

      window.ethereum.on('disconnect', () => {
        setWalletAddress('');
        setUserAddress('');
      });
    }

    // Cleanup function
    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
        window.ethereum.removeAllListeners('disconnect');
      }
    };
  }, []);

  async function handleConnectWallet() {
    if (!provider) {
      alert('Please install MetaMask to connect your wallet!');
      return;
    }

    try {
      const accounts = await provider.send('eth_requestAccounts', []);
      setWalletAddress(accounts[0]);
      setUserAddress(accounts[0]);
    } catch (error) {
      console.error('Error connecting to wallet:', error);
    }
  }

  async function getTokenBalance() {
    setIsLoading(true);
    setHasQueried(false); // Reset query state
    setDisplayedTokens([]); // Reset displayed tokens
    
    try {
      const config = {
        apiKey: import.meta.env.VITE_ALCHEMY_API_KEY,
        network: Network.ETH_SEPOLIA,
      };

      const alchemy = new Alchemy(config);
      const data = await alchemy.core.getTokenBalances(userAddress);

      setResults(data);
      
      const tokenDataPromises = [];

      for (let i = 0; i < data.tokenBalances.length; i++) {
        const tokenData = alchemy.core.getTokenMetadata(
          data.tokenBalances[i].contractAddress
        );
        tokenDataPromises.push(tokenData);
      }

      setTokenDataObjects(await Promise.all(tokenDataPromises));
      setHasQueried(true);
      
      // Initialize displayed tokens with first batch
      const initialTokens = Math.min(tokensPerPage, data.tokenBalances.length);
      setDisplayedTokens(data.tokenBalances.slice(0, initialTokens));
      setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching token balances:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const loadMoreTokens = () => {
    const nextPage = currentPage + 1;
    const startIndex = currentPage * tokensPerPage;
    const endIndex = startIndex + tokensPerPage;
    const newTokens = results.tokenBalances.slice(startIndex, endIndex);
    
    setDisplayedTokens(prev => [...prev, ...newTokens]);
    setCurrentPage(nextPage);
  };

  const hasMoreTokens = displayedTokens.length < results.tokenBalances?.length;
  return (

    <Box w="100vw">
      <Center>
        <Flex
          alignItems={'center'}
          justifyContent="center"
          flexDirection={'column'}
        >
          <Heading mb={0} fontSize={42} textShadow={"0 0 20px rgba(0, 0, 0, 0.6)"}>
            ERC-20 Token Indexer
          </Heading>
          <Text textShadow={"0 0 20px rgba(0, 0, 0, 0.6)"}>
            Plug in an address and this website will return all of its ERC-20
            token balances!
          </Text>
        </Flex>
      </Center>
      <Center w="100%" px={4}>
        <Flex
          w="80%"
          maxW="1200px"
          flexDirection="column"
          alignItems="center"
          justifyContent={'center'}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
            margin: '20px auto',
            padding: '10px 20px',
            minHeight: '600px'
          }}
        >
        <Button
          onClick={handleConnectWallet}
          bgColor="blue"
          color="white"
          isDisabled={!provider}
        >
          {!provider 
            ? 'MetaMask Not Detected' 
            : walletAddress 
              ? `Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` 
              : 'Connect Wallet'
          }
        </Button>
        {walletAddress && (
          <Button 
            mt={8} 
            _hover={{ border: '1px solid white' }} 
            bgColor="#cf1e03ff" 
            onClick={() => {
              setWalletAddress('');
              setUserAddress('');
            }}
          >
            Disconnect
          </Button>
        )}

        <Heading mt={42}>
          Get all the ERC-20 token balances of this address:
        </Heading>
        <Input
          onChange={(e) => setUserAddress(e.target.value)}
          color="black"
          w="600px"
          textAlign="center"
          p={4}
          bgColor="white"
          fontSize={24}
          placeholder={userAddress || 'Enter an Ethereum address...'}
          rounded={16}
        />
        <Button 
          fontSize={20} 
          onClick={getTokenBalance} 
          mt={36} 
          bgColor="blue"
          isLoading={isLoading}
          loadingText="Loading..."
          spinner={<Spinner size="md" color="white" />}
          isDisabled={isLoading || !userAddress}
        >
          Check ERC-20 Token Balances
        </Button>
        <Heading my={36}>ERC-20 token balances:</Heading>

        {hasQueried ? (
          <Box w={'70vw'}>
            <SimpleGrid columns={3} spacing={24}>
              {displayedTokens.map((e, i) => {
                const tokenIndex = results.tokenBalances.findIndex(token => token.contractAddress === e.contractAddress);
                return (
                  <Flex
                    flexDir={'column'}
                    color="white"
                    bg="blue.500"
                    w={'20vw'}
                    key={e.contractAddress}
                    p={6}
                    style={{
                      borderRadius: '16px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                      transition: 'all 0.3s ease'
                    }}
                    _hover={{
                      transform: "translateY(-4px)",
                      style: {
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                      }
                    }}
                    border="1px solid"
                    borderColor="blue.400"
                  >
                    <Box>
                      <b>Symbol:</b> {tokenDataObjects[tokenIndex]?.symbol || 'N/A'}&nbsp;
                    </Box>
                    <Box>
                      <b>Balance:</b>&nbsp;
                      {Utils.formatUnits(
                        e.tokenBalance,
                        tokenDataObjects[tokenIndex]?.decimals || 18
                      )}
                    </Box>
                    {tokenDataObjects[tokenIndex]?.logo && (
                      <Image 
                        src={tokenDataObjects[tokenIndex].logo} 
                        alt={tokenDataObjects[tokenIndex].symbol}
                        maxH="50px"
                        maxW="50px"
                        mt={2}
                      />
                    )}
                  </Flex>
                );
              })}
            </SimpleGrid>
            
            {hasMoreTokens && (
              <Center mt={8}>
                <Button
                  onClick={loadMoreTokens}
                  colorScheme="blue"
                  variant="outline"
                  size="lg"
                >
                  Load More Tokens ({results.tokenBalances.length - displayedTokens.length} remaining)
                </Button>
              </Center>
            )}
            
            {!hasMoreTokens && displayedTokens.length > 0 && (
              <Center mt={8}>
                <Text color="gray.500" fontSize="sm">
                  All tokens loaded ({displayedTokens.length} total)
                </Text>
              </Center>
            )}
          </Box>
        ) : (
          'Please make a query! This may take a few seconds...'
        )}
      </Flex>
      </Center>
    </Box>
  );
}

export default App;
