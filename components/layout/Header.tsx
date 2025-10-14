"use client";

import { 
  ActionIcon,
  Box,
  Button,
  Flex,
  Group,
  Text,
  useMantineColorScheme,
  Drawer,
  Stack,
  Divider,
  rem,
  Menu,
  Avatar,
  Loader
} from '@mantine/core';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconMoon, IconSun, IconUser, IconMenu2, IconLogout, IconLogin, IconCalculator } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { useAuth } from '../../contexts/AuthContext';

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
  const [opened, { open, close }] = useDisclosure(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { user, loading, signOut } = useAuth();
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const toggleColorScheme = () => {
    setColorScheme(colorScheme === 'dark' ? 'light' : 'dark');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      // Nach dem Abmelden zur Auth-Seite weiterleiten
      window.location.href = '/auth';
    } catch (error) {
      console.error('Fehler beim Abmelden:', error);
    }
  };

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {navLinks.map((link) => (
        <Button
          key={link.href}
          component={Link}
          href={link.href}
          variant={pathname === link.href ? 'light' : 'subtle'}
          color={pathname === link.href ? 'blue' : 'gray'}
          size={isMobile ? "md" : "sm"}
          onClick={onClick}
          fullWidth={isMobile}
          justify={isMobile ? "flex-start" : "center"}
        >
          {link.label}
        </Button>
      ))}
    </>
  );

  const UserActions = () => {
    if (loading) {
      return <Loader size="sm" />;
    }

    if (!user) {
      return (
        <ActionIcon 
          variant="subtle" 
          size="lg"
          color="gray"
          component={Link}
          href="/auth"
          title="Anmelden"
        >
          <IconLogin size={20} />
        </ActionIcon>
      );
    }

    return (
      <Menu shadow="md" width={200}>
        <Menu.Target>
          <ActionIcon 
            variant="subtle" 
            size="lg"
            color="gray"
            title="Benutzermenü"
          >
            <Avatar size={20} color="blue">
              {user.email?.charAt(0).toUpperCase()}
            </Avatar>
          </ActionIcon>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>
            {user.email}
          </Menu.Label>
          <Menu.Item 
            leftSection={<IconUser size={14} />}
            component={Link}
            href="/account"
          >
            Konto
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item 
            leftSection={<IconLogout size={14} />}
            color="red"
            onClick={handleSignOut}
          >
            Abmelden
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    );
  };
  
  return (
    <>
      <Box
        component="header"
        suppressHydrationWarning
        style={{
          position: 'fixed',
          top: isMobile ? '8px' : '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: isMobile ? '95%' : '90%',
          maxWidth: '1200px',
          zIndex: 100,
          backdropFilter: 'blur(16px)',
          padding: isMobile ? '0.5rem 0.75rem' : '0.75rem 1rem',
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
          <Group gap="xs">
            <ActionIcon 
              variant="subtle" 
              size="lg"
              color="blue"
              component={Link}
              href="/"
              title="Startseite"
            >
              <IconCalculator size={20} />
            </ActionIcon>
            <Text fw={700} size={isMobile ? "lg" : "xl"} c="blue.5">
              {isMobile ? "HB" : "Haushaltsbuch"}
            </Text>
          </Group>
          
          {!isMobile && (
            <Group justify="center" style={{ flex: 1 }}>
              <NavLinks />
            </Group>
          )}
          
          <Group gap={isMobile ? "xs" : "sm"}>
            {isMobile && (
              <ActionIcon 
                variant="subtle" 
                onClick={open}
                size="lg"
                color="gray"
                title="Menü öffnen"
              >
                <IconMenu2 size={20} />
              </ActionIcon>
            )}
            
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
            
            <UserActions />
          </Group>
        </Flex>
      </Box>

      {/* Mobile Navigation Drawer */}
      <Drawer
        opened={opened}
        onClose={close}
        title="Navigation"
        padding="md"
        size="xs"
        position="right"
        styles={{
          header: {
            paddingBottom: rem(10),
          },
          title: {
            fontWeight: 700,
            fontSize: rem(18),
          }
        }}
      >
        <Stack gap="sm">
          <NavLinks onClick={close} />
          <Divider my="sm" />
          <Text size="sm" c="dimmed" ta="center">
            Haushaltsbuch v1.0
          </Text>
        </Stack>
      </Drawer>
    </>
  );
}