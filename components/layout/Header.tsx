"use client";

import { 
  ActionIcon,
  Box,
  Button,
  Flex,
  Group,
  Text,
  useMantineColorScheme
} from '@mantine/core';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconMoon, IconSun, IconUser } from '@tabler/icons-react';
import { useState, useEffect } from 'react';

const navLinks = [
  { label: 'Dashboard', href: '/' },
  { label: 'Budget', href: '/budget' },
  { label: 'Transaktionen', href: '/transactions' },
  { label: 'Kosten', href: '/costs' },
];

export function Header() {
  const pathname = usePathname();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const toggleColorScheme = () => {
    setColorScheme(colorScheme === 'dark' ? 'light' : 'dark');
  };
  
  return (
    <Box
      component="header"
      suppressHydrationWarning
      style={{
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '90%',
        maxWidth: '1200px',
        zIndex: 100,
        backdropFilter: 'blur(16px)',
        padding: '0.75rem 1rem',
        backgroundColor: mounted 
          ? (colorScheme === 'dark' ? 'rgba(26, 27, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)')
          : 'rgba(26, 27, 30, 0.85)',
        borderRadius: '12px',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
        border: mounted 
          ? `1px solid ${colorScheme === 'dark' ? 'rgba(44, 46, 51, 0.5)' : 'rgba(233, 236, 239, 0.8)'}`
          : '1px solid rgba(44, 46, 51, 0.5)'
      }}
    >
      <Flex justify="space-between" align="center" w="100%">
          <Text fw={700} size="xl" c="blue.5">Haushaltsbuch</Text>
          
          <Group justify="center" style={{ flex: 1 }}>
            {navLinks.map((link) => (
              <Button
                key={link.href}
                component={Link}
                href={link.href}
                variant={pathname === link.href ? 'light' : 'subtle'}
                color={pathname === link.href ? 'blue' : 'gray'}
                size="sm"
              >
                {link.label}
              </Button>
            ))}
          </Group>
          
          <Group>
            <ActionIcon 
              variant="subtle" 
              onClick={toggleColorScheme} 
              size="lg"
              color="gray"
              title="Farbschema umschalten"
              suppressHydrationWarning={true}
            >
              {mounted ? (
                colorScheme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />
              ) : (
                <IconSun size={20} />
              )}
            </ActionIcon>
            
            <ActionIcon 
              variant="subtle" 
              size="lg"
              color="gray"
              component={Link}
              href="/account"
              title="Konto"
            >
              <IconUser size={20} />
            </ActionIcon>
          </Group>
        </Flex>
    </Box>
  );
}