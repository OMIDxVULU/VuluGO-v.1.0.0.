import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text, Button, Card, ProgressBar, Divider } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import ScrollableContentContainer from '../components/ScrollableContentContainer';

interface MiningTask {
  id: string;
  name: string;
  reward: number;
  progress: number;
  totalTime: string;
  remainingTime: string;
  icon: string;
}

const MiningScreen = () => {
  const router = useRouter();

  const miningTasks: MiningTask[] = [
    { 
      id: '1', 
      name: 'Gold Rush', 
      reward: 250, 
      progress: 0.65, 
      totalTime: '4h', 
      remainingTime: '1h 24m',
      icon: 'landscape'
    },
    { 
      id: '2', 
      name: 'Diamond Cave', 
      reward: 500, 
      progress: 0.25, 
      totalTime: '8h', 
      remainingTime: '6h 03m',
      icon: 'terrain'
    },
    { 
      id: '3', 
      name: 'Emerald Forest', 
      reward: 350, 
      progress: 0.45, 
      totalTime: '6h', 
      remainingTime: '3h 18m',
      icon: 'forest'
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <MaterialIcons name="monetization-on" size={24} color="#FFD700" style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Mining Gold</Text>
        </View>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(main)')}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollableContentContainer style={styles.content}>
        {/* Gold Balance */}
        <View style={styles.balanceContainer}>
          <View style={styles.balanceContent}>
            <View style={styles.goldIconContainer}>
              <MaterialIcons name="monetization-on" size={48} color="#FFD700" />
            </View>
            <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>Your Gold Balance</Text>
              <Text style={styles.balanceAmount}>1,250</Text>
            </View>
          </View>
          <View style={styles.balanceActions}>
            <Button 
              mode="contained" 
              buttonColor="#FFD700"
              textColor="#000000"
              style={styles.balanceButton}
            >
              Collect Rewards
            </Button>
            <Button 
              mode="outlined" 
              textColor="#FFD700"
              style={[styles.balanceButton, styles.outlinedButton]}
            >
              Convert to Cash
            </Button>
          </View>
        </View>

        {/* Mining Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>4,580</Text>
            <Text style={styles.statLabel}>Total Mined</Text>
          </View>
          <Divider style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Tasks Completed</Text>
          </View>
          <Divider style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>Active Tasks</Text>
          </View>
        </View>

        {/* Mining Tasks */}
        <Text style={styles.sectionTitle}>Active Mining Tasks</Text>
        {miningTasks.map((task) => (
          <Card key={task.id} style={styles.taskCard}>
            <Card.Content>
              <View style={styles.taskHeader}>
                <View style={styles.taskTitleContainer}>
                  <View style={[styles.taskIconContainer, {backgroundColor: getTaskColor(task.id)}]}>
                    <MaterialIcons name={task.icon as any} size={24} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text style={styles.taskTitle}>{task.name}</Text>
                    <Text style={styles.taskReward}>+{task.reward} Gold</Text>
                  </View>
                </View>
                <TouchableOpacity>
                  <MaterialIcons name="more-vert" size={24} color="#8E8E93" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.taskProgress}>
                <ProgressBar 
                  progress={task.progress} 
                  color={getTaskColor(task.id)} 
                  style={styles.progressBar}
                />
                <View style={styles.taskTimeContainer}>
                  <Text style={styles.taskTimeText}>{task.remainingTime} left</Text>
                  <Text style={styles.taskTimeText}>Total: {task.totalTime}</Text>
                </View>
              </View>
            </Card.Content>
            <Card.Actions style={styles.taskActions}>
              <Button 
                mode="outlined" 
                textColor="#FFFFFF"
                style={styles.taskButton}
              >
                Boost Speed
              </Button>
              <Button 
                mode="contained" 
                buttonColor={getTaskColor(task.id)}
                textColor="#FFFFFF"
                style={styles.taskButton}
                disabled={task.progress < 1}
              >
                Collect
              </Button>
            </Card.Actions>
          </Card>
        ))}
        
        <Button 
          mode="contained" 
          buttonColor="#6E69F4"
          textColor="#FFFFFF"
          icon="plus"
          style={styles.newTaskButton}
        >
          Start New Mining Task
        </Button>
      </ScrollableContentContainer>
    </SafeAreaView>
  );
};

// Get a color based on the task ID
const getTaskColor = (id: string): string => {
  const colors = {
    '1': '#FFD700', // Gold
    '2': '#3897F0', // Blue
    '3': '#50C878', // Green
  };
  return colors[id as keyof typeof colors] || '#FFD700';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131318',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  balanceContainer: {
    backgroundColor: '#1C1D23',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  balanceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  goldIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceInfo: {
    marginLeft: 16,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  balanceActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  outlinedButton: {
    borderColor: '#FFD700',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1C1D23',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  taskCard: {
    backgroundColor: '#1C1D23',
    marginBottom: 16,
    borderRadius: 16,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  taskTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  taskReward: {
    fontSize: 14,
    color: '#FFD700',
  },
  taskProgress: {
    marginBottom: 16,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  taskTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  taskTimeText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  taskActions: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'flex-end',
  },
  taskButton: {
    marginLeft: 8,
  },
  newTaskButton: {
    marginVertical: 16,
  },
});

export default MiningScreen; 